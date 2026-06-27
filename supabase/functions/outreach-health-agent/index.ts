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
  const trimmed = (RESEND_KEY ?? "").trim();
  const prefix = trimmed.slice(0, 8);
  const keyLen = (RESEND_KEY ?? "").length;
  const hasWs = !!RESEND_KEY && RESEND_KEY !== trimmed;
  console.log("[resend.probe] prefix=", prefix, "len=", keyLen, "ws=", hasWs, "starts_re_=", trimmed.startsWith("re_"));

  if (!trimmed) return { provider: "resend", status: "red", failure_reason: "MISSING_SECRET", message: "RESEND_API_KEY missing", repair_action: "manual_required" };

  // Persist diag basics every probe
  const baseDiag = { id: 1, resend_key_prefix: prefix, resend_key_length: keyLen, resend_last_checked_at: new Date().toISOString() };

  // Lovable connector keys (lovc_…) are VALID and must be routed via the Lovable gateway.
  // Treat them like a normal Resend key here, but call the gateway endpoint.
  const isGatewayKey = trimmed.startsWith("lovc_");
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY") ?? "";
  if (isGatewayKey && !LOVABLE_API_KEY) {
    await supabase.from("outreach_health_state").upsert({ ...baseDiag, resend_last_error: "LOVABLE_API_KEY missing (gateway routing requires it)" });
    return { provider: "resend", status: "red", failure_reason: "MISSING_SECRET",
      message: "LOVABLE_API_KEY missing — required to route lovc_ key through Lovable gateway", repair_action: "manual_required" };
  }
  if (!isGatewayKey && !trimmed.startsWith("re_")) {
    await supabase.from("outreach_health_state").upsert({ ...baseDiag, resend_last_error: `bad_format prefix=${prefix}` });
    return { provider: "resend", status: "red", failure_reason: "WRONG_VARIABLE_MAPPING",
      message: `Key does not start with re_ or lovc_ · prefix=${prefix} · len=${keyLen}`, repair_action: "update_secret" };
  }
  if (hasWs) {
    await supabase.from("outreach_health_state").upsert({ ...baseDiag, resend_last_error: "whitespace_in_secret" });
    return { provider: "resend", status: "red", failure_reason: "WHITESPACE_CORRUPTION",
      message: `Secret contains whitespace/newline · raw_len=${keyLen} trimmed=${trimmed.length}`, repair_action: "update_secret" };
  }

  const fetchResend = (path: string) => isGatewayKey
    ? fetch(`https://connector-gateway.lovable.dev/resend${path}`, {
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "X-Connection-Api-Key": trimmed },
      })
    : fetch(`https://api.resend.com${path}`, { headers: { Authorization: `Bearer ${trimmed}` } });

  try {
    // 1) Auth ping — /api-keys requires `api_keys:read`. Returns 200 with Full-access, 401/403 with sending-only.
    const auth = await fetch("https://api.resend.com/api-keys", { headers: { Authorization: `Bearer ${trimmed}` } });
    let accountId: string | null = null;
    if (auth.status === 401 || auth.status === 403) {
      // Sending-only keys hit here; do NOT fail yet — fall through to /domains which works for sending keys too.
      console.log("[resend.probe] api-keys", auth.status, "(likely sending-only scope) — continuing");
    } else if (auth.status === 400) {
      const b = await readResendBody(auth);
      const msg = (b.message ?? "").toLowerCase();
      if (msg.includes("invalid") || msg.includes("api key")) {
        await supabase.from("outreach_health_state").upsert({ ...baseDiag, resend_last_error: `auth 400 ${b.message} · prefix=${prefix} len=${keyLen}` });
        return { provider: "resend", status: "red", failure_reason: "RESEND_AUTH_ERROR",
          message: `HTTP 400 — ${b.message ?? "API key is invalid"} · prefix=${prefix} len=${keyLen}`, repair_action: "rotate_secret" };
      }
    } else if (auth.ok) {
      const b = await readResendBody(auth);
      try { accountId = JSON.parse(b.raw)?.data?.[0]?.id ?? null; } catch {}
    }

    // 2) Domains — source of truth for verified sender (works with sending-access keys)
    const dom = await fetch("https://api.resend.com/domains", { headers: { Authorization: `Bearer ${trimmed}` } });
    if (!dom.ok) {
      const b = await readResendBody(dom);
      const msg = (b.message ?? "").toLowerCase();
      const isAuthLike = dom.status === 401 || dom.status === 403 || (dom.status === 400 && (msg.includes("invalid") || msg.includes("api key")));
      await supabase.from("outreach_health_state").upsert({
        ...baseDiag,
        resend_account_id: accountId,
        resend_last_error: `domains HTTP ${dom.status}: ${b.message ?? b.raw.slice(0,200)} · prefix=${prefix} len=${keyLen}`,
      });
      return {
        provider: "resend",
        status: "red",
        failure_reason: isAuthLike ? "RESEND_AUTH_ERROR" : "RESEND_PROVIDER_ERROR",
        message: `HTTP ${dom.status} — ${b.message ?? b.name ?? b.raw.slice(0,200)} · prefix=${prefix}`,
        repair_action: isAuthLike ? "rotate_secret" : "manual_required",
      };
    }
    const body = await readResendBody(dom);
    let domains: any[] = [];
    try { domains = JSON.parse(body.raw)?.data ?? []; } catch {}
    const verified = domains.find(d => d?.status === "verified") ?? domains.find(d => d?.status === "active");
    await supabase.from("outreach_health_state").upsert({
      ...baseDiag,
      resend_account_id: accountId,
      resend_verified_domain: verified?.name ?? null,
      resend_last_error: verified ? null : "NO_VERIFIED_DOMAIN",
    });
    if (!verified) return { provider: "resend", status: "red", failure_reason: "NO_VERIFIED_DOMAIN",
      message: `No verified domain (found ${domains.length}) · prefix=${prefix}`, repair_action: "manual_required" };

    // 3) Honest cap — require a real send within 24h before going green.
    const { data: state } = await supabase.from("outreach_health_state").select("resend_last_send_status,resend_last_send_at").eq("id", 1).maybeSingle();
    const lastSendAt = state?.resend_last_send_at ? new Date(state.resend_last_send_at).getTime() : 0;
    const sendFresh = state?.resend_last_send_status === "sent" && (Date.now() - lastSendAt < 24 * 3600 * 1000);
    if (!sendFresh) {
      return { provider: "resend", status: "yellow", failure_reason: "NO_RECENT_SEND",
        message: `API ok · sender ${verified.name} · prefix=${prefix} · no real send <24h`, repair_action: "run_send_test" };
    }

    // 4) Webhook freshness (informational — yellow only)
    const { data } = await supabase.from("outreach_email_events").select("created_at").order("created_at",{ascending:false}).limit(1);
    const last = (data as any)?.[0]?.created_at;
    if (last && Date.now() - new Date(last).getTime() > 30 * 60 * 1000) {
      return { provider: "resend", status: "yellow", failure_reason: "WEBHOOK_STALE",
        message: `last event ${last} · sender ${verified.name}`, repair_action: "recreate_webhook" };
    }
    return { provider: "resend", status: "green", message: `API ok · sender ${verified.name} · prefix=${prefix}` };
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

async function getLastE2EPass(): Promise<{ pass: boolean; fresh: boolean; at: string | null }> {
  const { data } = await supabase.from("outreach_e2e_full_runs").select("pass,created_at")
    .eq("step", "summary").order("created_at", { ascending: false }).limit(1).maybeSingle();
  const at = (data as any)?.created_at ?? null;
  const pass = !!(data as any)?.pass;
  const fresh = at ? (Date.now() - new Date(at).getTime() < 24 * 3600 * 1000) : false;
  return { pass, fresh, at };
}

type Scores = { infrastructure: number; messaging: number; tracking: number; payments: number; automation: number; conversion: number; autopilot: number };

async function computeScore(probes: Probe[]) {
  const groupFor: Record<string, keyof Scores> = {
    database: "infrastructure", pg_cron: "infrastructure", redirect_tracker: "tracking",
    resend: "messaging", twilio: "messaging", stripe: "payments",
  };
  const scores: Scores = { infrastructure: 100, messaging: 100, tracking: 100, payments: 100, automation: 100, conversion: 100, autopilot: 100 };
  for (const p of probes) {
    const grp = groupFor[p.provider] ?? "automation";
    const delta = p.status === "red" ? 50 : p.status === "yellow" ? 20 : 0;
    scores[grp] = Math.max(0, scores[grp] - delta);
  }

  // ---- Honesty caps ----
  const reason_capped: string[] = [];
  const resend = probes.find(p => p.provider === "resend");
  if (resend && resend.status !== "green") {
    if (scores.messaging > 60) { scores.messaging = 60; reason_capped.push("messaging≤60 (Resend not green)"); }
  }
  const e2e = await getLastE2EPass();
  const e2eOk = e2e.pass && e2e.fresh;
  if (!e2eOk) {
    if (scores.automation > 70) { scores.automation = 70; reason_capped.push("automation≤70 (no fresh E2E pass)"); }
    if (scores.autopilot > 70) { scores.autopilot = 70; reason_capped.push("autopilot≤70 (no fresh E2E pass)"); }
  }
  if (scores.messaging < 95 && scores.autopilot > 70) {
    scores.autopilot = 70; reason_capped.push("autopilot≤70 (messaging<95)");
  }

  let overall = Math.round(Object.values(scores).reduce((a, b) => a + b, 0) / Object.values(scores).length);
  // Overall can never exceed the weakest pillar
  const weakest = Math.min(...Object.values(scores));
  if (overall > weakest) { overall = weakest; reason_capped.push(`overall≤${weakest} (weakest pillar)`); }
  if (!e2eOk && overall > 70) { overall = 70; reason_capped.push("overall≤70 (no fresh E2E pass)"); }

  return { ...scores, overall, reason_capped, e2e_pass: e2eOk, e2e_last_at: e2e.at };
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

  // Compute & persist operational score (async — reads latest E2E)
  const score = await computeScore(probes);
  const { reason_capped: _rc, e2e_pass: _ep, e2e_last_at: _ea, ...scoreRow } = score;
  await supabase.from("outreach_operational_score").insert(scoreRow);

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
