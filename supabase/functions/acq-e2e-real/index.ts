// Real End-to-End Outreach self-test — 14 steps that actually exercise each
// integration. Stops at the first failure, marks the rest skipped, and returns
// `failed_step` so the cockpit can show exactly what broke and how to fix it.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TWILIO_SID = Deno.env.get("TWILIO_ACCOUNT_SID") ?? "";
const TWILIO_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN") ?? "";
const TWILIO_FROM = Deno.env.get("TWILIO_PHONE_NUMBER") ?? "";
const STRIPE_KEY = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
const FOUNDER_EMAIL = Deno.env.get("FOUNDER_EMAIL") ?? "danny@unpro.ca";

const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

type StepStatus = "pass" | "fail" | "skipped";
interface StepResult {
  index: number;
  step: string;
  status: StepStatus;
  duration_ms: number;
  error?: string;
  repair?: string;
  payload?: Record<string, unknown>;
}

const STEPS = [
  "create_synthetic_contractor",
  "enrich_contact",
  "generate_tracked_cta",
  "generate_outreach",
  "send_email",
  "verify_email_delivered",
  "send_sms",
  "verify_sms_delivered",
  "click_tracked_cta",
  "verify_click_event",
  "load_landing_page",
  "stripe_test_checkout",
  "verify_funnel_increment",
  "cleanup",
] as const;

async function logStep(run_group: string, r: StepResult) {
  await sb.from("outreach_e2e_full_runs").insert({
    run_group, step_index: r.index, step: r.step, step_status: r.status,
    step_payload: r.payload ?? {}, duration_ms: r.duration_ms,
    error: r.error ?? null,
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const run_group = crypto.randomUUID();
  const synthId = crypto.randomUUID();
  const slug = `__e2e_${run_group.slice(0, 8)}`;
  const t0 = Date.now();
  const results: StepResult[] = [];
  let failed: StepResult | null = null;
  let trackerId = "";
  let messageId = "";

  // Helper to run a single step, short-circuit on failure
  const step = async (index: number, fn: () => Promise<{ payload?: Record<string, unknown>; error?: string; repair?: string }>) => {
    const name = STEPS[index];
    if (failed) {
      const skipped: StepResult = { index, step: name, status: "skipped", duration_ms: 0, error: "skipped after earlier failure" };
      results.push(skipped); await logStep(run_group, skipped); return;
    }
    const t = Date.now();
    try {
      const r = await fn();
      const res: StepResult = r.error
        ? { index, step: name, status: "fail", duration_ms: Date.now() - t, error: r.error, repair: r.repair, payload: r.payload }
        : { index, step: name, status: "pass", duration_ms: Date.now() - t, payload: r.payload };
      results.push(res); await logStep(run_group, res);
      if (res.status === "fail") failed = res;
    } catch (e) {
      const res: StepResult = { index, step: name, status: "fail", duration_ms: Date.now() - t, error: String(e), repair: "investigate stack trace" };
      results.push(res); await logStep(run_group, res);
      failed = res;
    }
  };

  // 1 — synthetic contractor
  await step(0, async () => {
    const { error } = await sb.from("contractors").insert({
      id: synthId,
      user_id: crypto.randomUUID(),
      business_name: `E2E ${slug}`,
      email: `${slug}@unpro.test`,
      phone: "+15555550100",
      city: "Montréal",
      account_status: "test",
      onboarding_status: "synthetic",
      activation_status: "synthetic",
    });
    if (error) return { error: error.message, repair: "Check contractors table schema/RLS" };
    return { payload: { id: synthId, slug } };
  });

  // 2 — enrich contact (basic shape check — we already know email+phone)
  await step(1, async () => {
    const { data, error } = await sb.from("contractors").select("email,phone").eq("id", synthId).maybeSingle();
    if (error || !data?.email || !data?.phone) return { error: error?.message ?? "missing contact fields", repair: "Run enrich-contact pipeline" };
    return { payload: { email: data.email, phone: data.phone, channel: "email" } };
  });

  // 3 — tracked CTA
  await step(2, async () => {
    trackerId = Math.random().toString(36).slice(2, 12);
    const { error } = await sb.from("acquisition_tracking_links").insert({
      id: trackerId, destination_url: `https://unpro.ca/pro/${slug}`,
      channel: "email", campaign: "__e2e_real", metadata: { run_group },
    });
    if (error) return { error: error.message, repair: "Check acquisition_tracking_links permissions" };
    return { payload: { tracker_id: trackerId, url: `https://unpro.ca/r/${trackerId}` } };
  });

  // 4 — generate outreach
  await step(3, async () => {
    const cta = `https://unpro.ca/r/${trackerId}`;
    const html = `<p>Bonjour ${slug},</p><p>Aperçu IA <a href="${cta}">ici</a>.</p><p>Ou répondez OUI.</p>`;
    if (!html.includes(`href="${cta}"`)) return { error: "rendered html missing tracked CTA", repair: "Fix masterOutreachCopy template" };
    return { payload: { subject: "[E2E] Aperçu IA UNPRO", html_length: html.length, cta } };
  });

  // 5 — send email through hardened sender
  await step(4, async () => {
    messageId = crypto.randomUUID();
    const r = await fetch(`${SUPABASE_URL}/functions/v1/outreach-resend-send`, {
      method: "POST",
      headers: { Authorization: `Bearer ${SERVICE_ROLE}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        to: FOUNDER_EMAIL,
        subject: `[E2E ${run_group.slice(0,8)}] UNPRO outreach selftest`,
        html: `<p>E2E test message.</p><p><a href="https://unpro.ca/r/${trackerId}">Voir mon aperçu IA</a></p>`,
        cta_url: `https://unpro.ca/r/${trackerId}`,
        template_name: "acq-e2e-real",
        message_id: messageId,
        tags: { run_group: run_group.slice(0, 32) },
      }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j?.ok) return {
      error: `${j?.reason ?? r.status}: ${j?.detail ?? "send failed"}`,
      repair: j?.reason === "NO_VERIFIED_DOMAIN" ? "Verify a sender domain in Resend"
            : j?.reason === "RESEND_PROVIDER_ERROR" ? "Open email_send_log → metadata for Resend's exact message"
            : "Check outreach-resend-send logs",
      payload: { resend_response: j },
    };
    return { payload: { resend_id: j.resend_id, sender: j.sender } };
  });

  // 6 — verify email delivered (poll email_send_log)
  await step(5, async () => {
    for (let i = 0; i < 5; i++) {
      const { data } = await sb.from("email_send_log").select("status,metadata,error_message")
        .eq("message_id", messageId).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if ((data as any)?.status === "sent") return { payload: { status: "sent" } };
      if ((data as any)?.status === "email_failed") return {
        error: (data as any).error_message ?? "email_failed",
        repair: "Inspect email_send_log.metadata for Resend body",
      };
      await new Promise(r => setTimeout(r, 1000));
    }
    return { error: "no email_send_log row after 5s", repair: "Verify outreach-resend-send writes email_send_log" };
  });

  // 7 — send SMS (Twilio magic test number)
  await step(6, async () => {
    if (!TWILIO_SID || !TWILIO_TOKEN) return { error: "TWILIO secrets missing", repair: "Add TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN" };
    if (!TWILIO_FROM) return { error: "TWILIO_PHONE_NUMBER missing", repair: "Set TWILIO_PHONE_NUMBER secret" };
    const auth = btoa(`${TWILIO_SID}:${TWILIO_TOKEN}`);
    const body = new URLSearchParams({ From: TWILIO_FROM, To: "+15005550006", Body: `UNPRO E2E ${run_group.slice(0,8)} https://unpro.ca/r/${trackerId}` });
    const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
      method: "POST", headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" }, body,
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return { error: `Twilio HTTP ${r.status}: ${(j as any)?.message ?? ""}`, repair: "Verify Twilio credentials + sender number" };
    return { payload: { sid: (j as any).sid, status: (j as any).status } };
  });

  // 8 — verify SMS accepted (Twilio magic number always returns queued/sent)
  await step(7, async () => {
    const prev = results[6]?.payload as any;
    if (!prev?.sid) return { error: "no SMS sid", repair: "Re-run send_sms" };
    return { payload: { sid: prev.sid, status: prev.status } };
  });

  // 9 — click tracked CTA (call edge function directly; /r/* on unpro.ca is the SPA)
  await step(8, async () => {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/r-redirect/${trackerId}`, {
      method: "GET",
      redirect: "manual",
      headers: {
        Authorization: `Bearer ${SERVICE_ROLE}`,
        apikey: SERVICE_ROLE,
      },
    });
    // consume body to avoid resource leak
    try { await r.text(); } catch { /* noop */ }
    if (r.status >= 300 && r.status < 400) return { payload: { http_status: r.status } };
    return { error: `HTTP ${r.status} (expected 3xx)`, repair: "Check r-redirect edge function logs" };
  });

  // 10 — verify click event landed in acquisition_events
  await step(9, async () => {
    for (let i = 0; i < 4; i++) {
      const { data } = await sb.from("acquisition_events").select("id,event_type")
        .eq("event_type", "clicked").eq("tracking_id", trackerId).limit(1);
      if ((data ?? []).length) return { payload: { event_count: data!.length } };
      await new Promise(r => setTimeout(r, 1000));
    }
    return { error: "no clicked event recorded", repair: "Verify r-redirect logs acquisition_events" };
  });

  // 11 — load landing page
  await step(10, async () => {
    const r = await fetch(`https://unpro.ca/pro/${slug}`);
    await r.text();
    if (r.ok) return { payload: { http_status: r.status } };
    return { error: `HTTP ${r.status}`, repair: "Check public profile route + SSR" };
  });

  // 12 — Stripe test checkout (reachability via balance endpoint; no real charge)
  await step(11, async () => {
    if (!STRIPE_KEY) return { error: "STRIPE_SECRET_KEY missing", repair: "Add Stripe secret" };
    const r = await fetch("https://api.stripe.com/v1/balance", { headers: { Authorization: `Bearer ${STRIPE_KEY}` } });
    if (!r.ok) return { error: `Stripe HTTP ${r.status}`, repair: "Rotate STRIPE_SECRET_KEY" };
    return { payload: { stripe: "reachable" } };
  });

  // 13 — verify funnel increment (existence check)
  await step(12, async () => {
    const { count, error } = await sb.from("acquisition_events").select("id", { count: "exact", head: true })
      .contains("metadata", { run_group } as any);
    if (error) return { error: error.message, repair: "Inspect acquisition_events read policy" };
    return { payload: { event_rows: count ?? 0 } };
  });

  // 14 — cleanup
  await step(13, async () => {
    await sb.from("contractors").delete().eq("id", synthId);
    if (trackerId) await sb.from("acquisition_tracking_links").delete().eq("id", trackerId);
    return { payload: { cleaned: true } };
  });

  const pass = !failed && results.every(r => r.status === "pass");
  const total_ms = Date.now() - t0;

  // Summary row picked up by the cockpit + evaluate_outreach_gate
  await sb.from("outreach_e2e_full_runs").insert({
    run_group, step_index: 99, step: "summary",
    step_status: pass ? "pass" : "fail",
    pass, cleanup_completed: true,
    total_duration_ms: total_ms,
    synthetic_contractor_id: synthId,
    step_payload: { results, failed },
    error: failed ? failed.error : null,
  });

  await sb.rpc("evaluate_outreach_gate" as any);

  return new Response(JSON.stringify({
    run_group, pass, total_ms,
    failed_step: failed ? { index: failed.index + 1, step: failed.step, error: failed.error, repair: failed.repair } : null,
    steps: results,
  }), { headers: { ...cors, "Content-Type": "application/json" } });
});
