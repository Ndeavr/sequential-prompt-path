// Active Outreach Health Engine — probes providers, records status,
// computes operational score, triggers repair-agent for automatable failures.
// Cron: every 15 minutes. Also callable on-demand from /admin/outreach-health.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ProbeStatus = "green" | "yellow" | "red" | "unknown";
interface Probe {
  provider: string;
  status: ProbeStatus;
  failure_reason?: string;
  message?: string;
  repair_action?: string;
  payload?: Record<string, unknown>;
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_KEY = Deno.env.get("RESEND_API_KEY");
const TWILIO_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
const TWILIO_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
const STRIPE_KEY = Deno.env.get("STRIPE_SECRET_KEY");

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

async function probeSecret(name: string, value: string | undefined): Promise<Probe> {
  return {
    provider: `secret:${name}`,
    status: value ? "green" : "red",
    failure_reason: value ? undefined : "MISSING_SECRET",
    message: value ? "present" : `${name} not set`,
    repair_action: value ? undefined : "manual_required",
  };
}

async function readResendBody(r: Response): Promise<{ name?: string; message?: string; raw: string }> {
  const raw = await r.text();
  try { const j = JSON.parse(raw); return { name: j?.name, message: j?.message, raw }; }
  catch { return { raw }; }
}

async function probeResend(): Promise<Probe> {
  if (!RESEND_KEY) return { provider: "resend", status: "red", failure_reason: "MISSING_SECRET", message: "RESEND_API_KEY missing", repair_action: "manual_required" };
  try {
    // 1) Auth ping — /api-keys requires `api_keys:read` scope but returns 200/401 on basic keys too
    const auth = await fetch("https://api.resend.com/api-keys", { headers: { Authorization: `Bearer ${RESEND_KEY}` } });
    if (auth.status === 401 || auth.status === 403) {
      const b = await readResendBody(auth);
      return { provider: "resend", status: "red", failure_reason: "RESEND_AUTH_ERROR",
        message: `${auth.status} — ${b.message ?? "invalid key"}`, repair_action: "rotate_secret" };
    }

    // 2) Domains — source of truth for verified sender
    const dom = await fetch("https://api.resend.com/domains", { headers: { Authorization: `Bearer ${RESEND_KEY}` } });
    if (!dom.ok) {
      const b = await readResendBody(dom);
      await supabase.from("outreach_health_state").upsert({ id: 1, resend_last_checked_at: new Date().toISOString(), resend_last_error: `HTTP ${dom.status}: ${b.message ?? b.raw.slice(0,200)}` });
      return { provider: "resend", status: "yellow", failure_reason: "RESEND_PROVIDER_ERROR",
        message: `HTTP ${dom.status} — ${b.message ?? b.name ?? b.raw.slice(0,200)}`,
        repair_action: dom.status === 400 ? "manual_required" : "rotate_secret" };
    }
    const body = await readResendBody(dom);
    let domains: any[] = [];
    try { domains = JSON.parse(body.raw)?.data ?? []; } catch {}
    const verified = domains.find(d => d?.status === "verified") ?? domains.find(d => d?.status === "active");
    await supabase.from("outreach_health_state").upsert({
      id: 1,
      resend_verified_domain: verified?.name ?? null,
      resend_last_checked_at: new Date().toISOString(),
      resend_last_error: verified ? null : "NO_VERIFIED_DOMAIN",
    });
    if (!verified) return { provider: "resend", status: "red", failure_reason: "NO_VERIFIED_DOMAIN",
      message: `No verified domain (found ${domains.length})`, repair_action: "manual_required" };

    // 3) Webhook freshness (informational — yellow only)
    const { data } = await supabase.from("outreach_email_events").select("created_at").order("created_at",{ascending:false}).limit(1);
    const last = (data as any)?.[0]?.created_at;
    if (last && Date.now() - new Date(last).getTime() > 30 * 60 * 1000) {
      return { provider: "resend", status: "yellow", failure_reason: "WEBHOOK_STALE",
        message: `last event ${last} · sender ${verified.name}`, repair_action: "recreate_webhook" };
    }
    return { provider: "resend", status: "green", message: `API ok · sender ${verified.name}` };
  } catch (e) {
    return { provider: "resend", status: "red", failure_reason: "EXTERNAL_TIMEOUT", message: String(e) };
  }
}

async function probeTwilio(): Promise<Probe> {
  if (!TWILIO_SID || !TWILIO_TOKEN) return { provider: "twilio", status: "red", failure_reason: "MISSING_SECRET", message: "TWILIO creds missing" };
  try {
    const auth = btoa(`${TWILIO_SID}:${TWILIO_TOKEN}`);
    const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}.json`, {
      headers: { Authorization: `Basic ${auth}` },
    });
    if (r.status === 401) return { provider: "twilio", status: "red", failure_reason: "TWILIO_AUTH_ERROR", message: "401 Unauthorized — TWILIO_AUTH_TOKEN changed", repair_action: "rotate_secret" };
    if (!r.ok) return { provider: "twilio", status: "yellow", failure_reason: "TWILIO_PROVIDER_ERROR", message: `HTTP ${r.status}` };
    const { data } = await supabase.from("outreach_sms_events").select("created_at").order("created_at",{ascending:false}).limit(1);
    const last = data?.[0]?.created_at;
    if (last && Date.now() - new Date(last).getTime() > 60 * 60 * 1000) {
      return { provider: "twilio", status: "yellow", failure_reason: "WEBHOOK_STALE", message: `last sms event ${last}`, repair_action: "recreate_webhook" };
    }
    return { provider: "twilio", status: "green", message: "API ok" };
  } catch (e) {
    return { provider: "twilio", status: "red", failure_reason: "EXTERNAL_TIMEOUT", message: String(e) };
  }
}

async function probeStripe(): Promise<Probe> {
  if (!STRIPE_KEY) return { provider: "stripe", status: "red", failure_reason: "MISSING_SECRET", message: "STRIPE_SECRET_KEY missing" };
  try {
    const r = await fetch("https://api.stripe.com/v1/balance", {
      headers: { Authorization: `Bearer ${STRIPE_KEY}` },
    });
    if (r.status === 401) return { provider: "stripe", status: "red", failure_reason: "STRIPE_AUTH_ERROR", message: "401 — key invalid", repair_action: "rotate_secret" };
    return r.ok ? { provider: "stripe", status: "green" } : { provider: "stripe", status: "yellow", message: `HTTP ${r.status}` };
  } catch (e) {
    return { provider: "stripe", status: "red", failure_reason: "EXTERNAL_TIMEOUT", message: String(e) };
  }
}

async function probeRedirect(): Promise<Probe> {
  try {
    const url = `${SUPABASE_URL}/functions/v1/r-redirect?probe=1`;
    const r = await fetch(url, { redirect: "manual" });
    if (r.status >= 500) return { provider: "redirect_tracker", status: "red", failure_reason: "REDIRECT_5XX", message: `HTTP ${r.status}`, repair_action: "redeploy_function" };
    return { provider: "redirect_tracker", status: "green", message: `HTTP ${r.status}` };
  } catch (e) {
    return { provider: "redirect_tracker", status: "red", failure_reason: "EXTERNAL_TIMEOUT", message: String(e) };
  }
}

async function probeCron(): Promise<Probe> {
  try {
    const { data, error } = await supabase.rpc("evaluate_outreach_gate" as any);
    if (error) return { provider: "pg_cron", status: "yellow", failure_reason: "CRON_RPC_ERROR", message: error.message };
    return { provider: "pg_cron", status: "green", payload: { evaluated: true } };
  } catch (e) {
    return { provider: "pg_cron", status: "yellow", failure_reason: "CRON_RPC_ERROR", message: String(e) };
  }
}

async function probeDatabase(): Promise<Probe> {
  try {
    const { error } = await supabase.from("outreach_health_checks").select("id").limit(1);
    return error ? { provider: "database", status: "red", failure_reason: "SUPABASE_TIMEOUT", message: error.message }
                 : { provider: "database", status: "green" };
  } catch (e) {
    return { provider: "database", status: "red", failure_reason: "SUPABASE_TIMEOUT", message: String(e) };
  }
}

function computeScore(probes: Probe[]) {
  const groupFor: Record<string, keyof Scores> = {
    database: "infrastructure", pg_cron: "infrastructure", redirect_tracker: "tracking",
    resend: "messaging", twilio: "messaging", stripe: "payments",
  };
  type Scores = { infrastructure: number; messaging: number; tracking: number; payments: number; automation: number; conversion: number; autopilot: number };
  const scores: Scores = { infrastructure: 100, messaging: 100, tracking: 100, payments: 100, automation: 100, conversion: 100, autopilot: 100 };
  for (const p of probes) {
    const grp = groupFor[p.provider] ?? "automation";
    const delta = p.status === "red" ? 50 : p.status === "yellow" ? 20 : 0;
    scores[grp] = Math.max(0, scores[grp] - delta);
  }
  const overall = Math.round(Object.values(scores).reduce((a, b) => a + b, 0) / Object.values(scores).length);
  return { ...scores, overall };
}

async function runRepair(probe: Probe): Promise<void> {
  if (!probe.repair_action || probe.repair_action === "manual_required") return;
  const start = Date.now();
  try {
    // Invoke repair-agent (best-effort; agent decides per-action)
    const res = await fetch(`${SUPABASE_URL}/functions/v1/outreach-repair-agent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_ROLE}` },
      body: JSON.stringify({ provider: probe.provider, action: probe.repair_action, failure_reason: probe.failure_reason }),
    });
    const ok = res.ok;
    await supabase.from("outreach_repair_runs").insert({
      provider: probe.provider, action: probe.repair_action,
      outcome: ok ? "success" : "failed",
      duration_ms: Date.now() - start,
      error: ok ? null : `HTTP ${res.status}`,
      payload: { failure_reason: probe.failure_reason },
    });
  } catch (e) {
    await supabase.from("outreach_repair_runs").insert({
      provider: probe.provider, action: probe.repair_action,
      outcome: "failed", duration_ms: Date.now() - start, error: String(e),
    });
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const probes: Probe[] = await Promise.all([
    probeDatabase(), probeResend(), probeTwilio(), probeStripe(), probeRedirect(), probeCron(),
    probeSecret("RESEND_API_KEY", RESEND_KEY),
    probeSecret("TWILIO_AUTH_TOKEN", TWILIO_TOKEN),
    probeSecret("STRIPE_SECRET_KEY", STRIPE_KEY),
  ]);

  // Persist health checks
  for (const p of probes) {
    await supabase.from("outreach_health_checks").insert({
      provider: p.provider, status: p.status,
      failure_reason: p.failure_reason ?? null,
      repair_action: p.repair_action ?? null,
      message: p.message ?? null,
      last_success_at: p.status === "green" ? new Date().toISOString() : null,
      last_failure_at: p.status !== "green" ? new Date().toISOString() : null,
      payload: p.payload ?? {},
    });
  }

  // Auto-repair where possible
  for (const p of probes) if (p.status !== "green" && p.repair_action) await runRepair(p);

  // Compute & persist operational score
  const score = computeScore(probes);
  await supabase.from("outreach_operational_score").insert(score);

  // Critical alerts
  for (const p of probes) {
    if (p.status === "red" && p.failure_reason !== "MISSING_SECRET") {
      await supabase.from("outreach_critical_alerts").insert({
        provider: p.provider, severity: "critical",
        root_cause: p.failure_reason ?? "UNKNOWN",
        affected_users: 0,
        revenue_at_risk_cents: 0,
        estimated_repair: p.repair_action ?? "manual_required",
        repair_progress: "queued",
        payload: { message: p.message },
      });
    }
  }

  // Re-evaluate gate so auto-unlock can trigger
  await supabase.rpc("evaluate_outreach_gate" as any);

  return new Response(JSON.stringify({ ok: true, probes, score }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
