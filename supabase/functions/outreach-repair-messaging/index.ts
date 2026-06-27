// UNPRO — Focused messaging repair sequence.
// Runs 5 sub-steps, logs every step into outreach_repair_runs, then triggers
// the health agent and a real E2E so the cockpit auto-refreshes truth.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SRK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_KEY = (Deno.env.get("RESEND_API_KEY") ?? "").trim();
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY") ?? "";
const FOUNDER_EMAIL = Deno.env.get("FOUNDER_EMAIL") ?? "danny@unpro.ca";

// Route Lovable connector keys (lovc_*) through the gateway, native re_* directly.
const IS_GATEWAY_KEY = RESEND_KEY.startsWith("lovc_");
function resendFetch(path: string, init: RequestInit = {}) {
  if (IS_GATEWAY_KEY) {
    return fetch(`https://connector-gateway.lovable.dev/resend${path}`, {
      ...init,
      headers: {
        ...(init.headers ?? {}),
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": RESEND_KEY,
      },
    });
  }
  return fetch(`https://api.resend.com${path}`, {
    ...init,
    headers: { ...(init.headers ?? {}), Authorization: `Bearer ${RESEND_KEY}` },
  });
}

const sb = createClient(SUPABASE_URL, SRK, { auth: { persistSession: false } });

type StepResult = { step: string; ok: boolean; detail: string; duration_ms: number; repair?: string };

async function logStep(s: StepResult, provider = "resend") {
  await sb.from("outreach_repair_runs").insert({
    provider, action: s.step,
    outcome: s.ok ? "success" : "manual_required",
    duration_ms: s.duration_ms,
    error: s.ok ? null : s.detail,
    payload: { repair: s.repair ?? null },
  });
}

async function runStep(step: string, fn: () => Promise<{ ok: boolean; detail: string; repair?: string }>): Promise<StepResult> {
  const t = Date.now();
  try {
    const r = await fn();
    const res = { step, ...r, duration_ms: Date.now() - t };
    await logStep(res);
    return res;
  } catch (e) {
    const res = { step, ok: false, detail: String(e), duration_ms: Date.now() - t, repair: "investigate_function" };
    await logStep(res);
    return res;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const steps: StepResult[] = [];

  // 1) Resend API key ping — uses gateway for lovc_* keys, direct for re_* keys.
  steps.push(await runStep("resend_api_key_ping", async () => {
    if (!RESEND_KEY) return { ok: false, detail: "RESEND_API_KEY missing", repair: "Add the RESEND_API_KEY secret in Lovable Cloud." };
    if (IS_GATEWAY_KEY && !LOVABLE_API_KEY) {
      return { ok: false, detail: "LOVABLE_API_KEY missing — required to route lovc_ key via gateway", repair: "Provision LOVABLE_API_KEY" };
    }
    if (!IS_GATEWAY_KEY && !RESEND_KEY.startsWith("re_")) {
      return { ok: false, detail: `Bad key format (prefix=${RESEND_KEY.slice(0, 5)}). Expected re_… or lovc_…`, repair: "Update RESEND_API_KEY secret" };
    }
    // /api-keys requires `api_keys:read`; sending-only keys 401/403 here, that's fine.
    const r = await resendFetch("/api-keys");
    const body = await r.text();
    if (r.ok) return { ok: true, detail: `api-keys 200 (${IS_GATEWAY_KEY ? "gateway" : "direct"})` };
    if (r.status === 401 || r.status === 403) {
      return { ok: true, detail: `api-keys ${r.status} (sending-only scope, OK) via ${IS_GATEWAY_KEY ? "gateway" : "direct"}` };
    }
    let msg = body; try { msg = JSON.parse(body)?.message ?? body; } catch {}
    return { ok: false, detail: `HTTP ${r.status} — ${msg} (${IS_GATEWAY_KEY ? "gateway" : "direct"})`,
      repair: r.status === 400 ? "Rotate or fix RESEND_API_KEY value" : "Check Resend dashboard" };
  }));
  if (!steps[0].ok) return finish(steps);

  // 2) Verified sender domain
  steps.push(await runStep("resend_verified_domain", async () => {
    const r = await resendFetch("/domains");
    const body = await r.text();
    if (!r.ok) {
      let msg = body; try { msg = JSON.parse(body)?.message ?? body; } catch {}
      return { ok: false, detail: `HTTP ${r.status} — ${msg}`, repair: "Verify a domain at resend.com/domains" };
    }
    let parsed: any = {}; try { parsed = JSON.parse(body); } catch {}
    const list: any[] = parsed?.data ?? [];
    const verified = list.find(d => d?.status === "verified") ?? list.find(d => d?.status === "active");
    if (!verified) {
      await sb.from("outreach_health_state").upsert({ id: 1, resend_verified_domain: null, resend_last_checked_at: new Date().toISOString(), resend_last_error: "NO_VERIFIED_DOMAIN" });
      return { ok: false, detail: `No verified domain (found ${list.length})`, repair: "Add + verify a sender domain in Resend" };
    }
    await sb.from("outreach_health_state").upsert({
      id: 1,
      resend_verified_domain: verified.name,
      resend_last_checked_at: new Date().toISOString(),
      resend_last_error: null,
    });
    return { ok: true, detail: `verified: ${verified.name}` };
  }));

  // 3) Live test send to founder
  steps.push(await runStep("resend_live_test_send", async () => {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/outreach-resend-send`, {
      method: "POST",
      headers: { Authorization: `Bearer ${SRK}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        to: FOUNDER_EMAIL,
        subject: "[UNPRO] Repair messaging — test send",
        html: `<p>Test de réparation messagerie.</p><p><a href="https://unpro.ca/pro/dashboard">Ouvrir le tableau de bord</a></p>`,
        cta_url: "https://unpro.ca/pro/dashboard",
        template_name: "repair-messaging",
      }),
    });
    const j = await r.json().catch(() => ({}));
    if (r.ok && j?.ok) return { ok: true, detail: `sent (resend_id=${j.resend_id ?? "?"})` };
    return { ok: false, detail: `${j?.reason ?? r.status}: ${j?.detail ?? "send failed"}`, repair: "See email_send_log for full Resend body" };
  }));

  // 4) CTA tracker generator
  steps.push(await runStep("cta_tracker_insert", async () => {
    const id = Math.random().toString(36).slice(2, 12);
    const { error } = await sb.from("acquisition_tracking_links").insert({
      id, destination_url: "https://unpro.ca/pro/dashboard",
      channel: "email", campaign: "__repair_messaging",
    });
    if (error) return { ok: false, detail: error.message, repair: "Inspect acquisition_tracking_links policies" };
    return { ok: true, detail: `tracker id ${id}` };
  }, ));

  // 5) /r/{id} redirect probe
  steps.push(await runStep("redirect_tracker_probe", async () => {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/r-redirect?probe=1`, { redirect: "manual" });
    if (r.status >= 200 && r.status < 400) return { ok: true, detail: `HTTP ${r.status}` };
    return { ok: false, detail: `HTTP ${r.status}`, repair: "Redeploy r-redirect function" };
  }));

  return finish(steps);
});

async function finish(steps: StepResult[]) {
  // Refresh truth: health agent + real E2E (best-effort, fire and proceed)
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/outreach-health-agent`, {
      method: "POST", headers: { Authorization: `Bearer ${SRK}` }, body: "{}",
    });
  } catch (_) { /* ignore */ }
  let e2e: any = null;
  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/acq-e2e-real`, {
      method: "POST", headers: { Authorization: `Bearer ${SRK}` }, body: "{}",
    });
    e2e = await r.json().catch(() => null);
  } catch (_) { /* ignore */ }

  const pass = steps.every(s => s.ok);
  return new Response(JSON.stringify({ ok: pass, steps, e2e }), {
    headers: { ...cors, "Content-Type": "application/json" },
  });
}
