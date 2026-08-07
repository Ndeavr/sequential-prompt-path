// UNPRO — Email sender health snapshot (truthful, multi-dimensional).
//
// Distinguishes SIX independent dimensions instead of one blended badge:
//   1. configured_sender  — the From string the canonical sender uses
//   2. domain             — evidence the sending domain is authorized (real provider acceptance)
//   3. api_request        — can we authenticate against the provider right now
//   4. provider_acceptance— last time the provider actually ACCEPTED an email (id returned)
//   5. delivery           — 7d delivery/bounce/failure rates
//   6. last_failure       — most recent failure WITH its channel (resend | lovable_emails)
//
// IMPORTANT: the previous version pinged `GET https://api.resend.com/domains`.
// The production RESEND_API_KEY is a Lovable connector key (`lovc_…`) that must be
// routed through the Lovable gateway AND is a send-only restricted key, so that
// probe could never succeed (HTTP 400/401 `restricted_api_key`) even while real
// sending worked. That false negative is fixed here.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const EXPECTED_SENDER = "Alex d'UNPRO <alex@mail.unpro.ca>";
const EXPECTED_ADDRESS = "alex@mail.unpro.ca";
const EXPECTED_DOMAIN = "mail.unpro.ca";

type Level = "ok" | "warn" | "blocked" | "unknown";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  const since = new Date(Date.now() - 7 * 86400_000).toISOString();
  const [logs, lastSent, lastAccepted, lastError, lastSelftest, mismatches, healthState] = await Promise.all([
    sb.from("email_send_log").select("status,created_at").gte("created_at", since).limit(5000),
    sb.from("email_send_log").select("created_at,message_id,template_name").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    // Provider ACCEPTANCE = a `sent` row that carries a real provider id.
    sb.from("email_send_log").select("created_at,message_id,template_name,metadata").eq("status", "sent")
      .order("created_at", { ascending: false }).limit(25),
    sb.from("email_send_log").select("created_at,error_message,status,template_name,metadata")
      .in("status", ["failed", "email_failed", "dlq", "bounced"]).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    sb.from("email_health_selftest_runs").select("ran_at,passed,provider_message_id,provider_response,error_message")
      .eq("run_type", "daily_selftest").order("ran_at", { ascending: false }).limit(1).maybeSingle(),
    sb.from("system_events").select("created_at,payload").eq("event_type", "EMAIL_SENDER_MISMATCH")
      .order("created_at", { ascending: false }).limit(10),
    sb.from("outreach_health_state").select("*").eq("id", 1).maybeSingle(),
  ]);

  // ---- 3. API request health (auth against the provider, gateway-aware) ----
  const resendKey = (Deno.env.get("RESEND_API_KEY") ?? "").trim();
  const lovableKey = (Deno.env.get("LOVABLE_API_KEY") ?? "").trim();
  const viaGateway = resendKey.startsWith("lovc_");

  let apiLevel: Level = "unknown";
  let apiStatusCode: number | null = null;
  let apiDetail = "no probe executed";
  let apiRoute = viaGateway ? "lovable_gateway" : "resend_direct";

  if (!resendKey) {
    apiLevel = "blocked";
    apiDetail = "RESEND_API_KEY not configured";
  } else if (viaGateway && !lovableKey) {
    apiLevel = "blocked";
    apiDetail = "LOVABLE_API_KEY missing — connector key cannot be routed through the gateway";
  } else {
    try {
      const probe = viaGateway
        ? await fetch("https://connector-gateway.lovable.dev/api/v1/verify_credentials", {
            method: "POST",
            headers: { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": resendKey },
          })
        : await fetch("https://api.resend.com/domains", { headers: { Authorization: `Bearer ${resendKey}` } });
      apiStatusCode = probe.status;
      const raw = (await probe.text()).slice(0, 300);
      let parsed: any = null;
      try { parsed = JSON.parse(raw); } catch { /* keep raw */ }
      if (viaGateway) {
        const outcome = parsed?.outcome ?? null;
        if (probe.ok && (outcome === "verified" || outcome === "skipped")) {
          apiLevel = "ok";
          apiDetail = `gateway credential check: ${outcome}`;
        } else {
          apiLevel = probe.status === 401 || probe.status === 403 ? "blocked" : "warn";
          apiDetail = parsed?.error ?? parsed?.message ?? raw ?? `HTTP ${probe.status}`;
        }
      } else if (probe.ok) {
        apiLevel = "ok";
        apiDetail = "GET /domains 200";
      } else {
        apiLevel = probe.status === 401 || probe.status === 403 ? "blocked" : "warn";
        apiDetail = parsed?.message ?? raw ?? `HTTP ${probe.status}`;
      }
    } catch (e) {
      apiLevel = "warn";
      apiDetail = `probe network error: ${String(e).slice(0, 200)}`;
    }
  }

  // ---- 4. Provider acceptance (real ids, not attempted requests) ----
  const acceptedRows = ((lastAccepted.data ?? []) as any[]).filter(
    (r) => r?.metadata?.resend_id || r?.metadata?.provider_id,
  );
  const lastAccept = acceptedRows[0] ?? null;
  const lastAcceptedAt: string | null = lastAccept?.created_at ?? null;
  const lastProviderId: string | null = lastAccept?.metadata?.resend_id ?? lastAccept?.metadata?.provider_id ?? null;
  const acceptedSender: string | null = lastAccept?.metadata?.sender ?? null;

  const acceptanceFresh =
    !!lastAcceptedAt && Date.now() - new Date(lastAcceptedAt).getTime() < 3 * 86400_000;
  const acceptanceLevel: Level = lastAcceptedAt ? (acceptanceFresh ? "ok" : "warn") : "unknown";

  // ---- 2. Domain authorization — only provable by a real accepted send from it ----
  const senderMatches = (acceptedSender ?? "").toLowerCase().includes(EXPECTED_ADDRESS);
  const domainLevel: Level = lastAcceptedAt && senderMatches ? "ok" : lastAcceptedAt ? "warn" : "unknown";
  const domainDetail = lastAcceptedAt
    ? senderMatches
      ? `Provider accepted mail from ${EXPECTED_DOMAIN} at ${lastAcceptedAt} (id ${lastProviderId ?? "n/a"})`
      : `Last accepted send used a different sender: ${acceptedSender}`
    : "No accepted provider send on record — domain authorization unproven";

  // ---- 5. Delivery ----
  const rows = (logs.data ?? []) as { status: string }[];
  const sent = rows.filter((r) => r.status === "sent").length;
  const delivered = rows.filter((r) => r.status === "delivered" || r.status === "sent").length;
  const bounced = rows.filter((r) => r.status === "bounced").length;
  const failed = rows.filter((r) => r.status === "failed" || r.status === "email_failed" || r.status === "dlq").length;
  const total = rows.length || 1;

  // ---- 6. Last failure, with channel attribution ----
  const errRow = (lastError as any).data ?? null;
  const errMsg: string | null = errRow?.error_message ?? null;
  const lovableEmailsDisabled = !!errMsg && /emails? disabled for this project/i.test(errMsg);
  const failureChannel = errRow
    ? lovableEmailsDisabled || errRow.template_name === "prospect-outreach"
      ? "lovable_emails"
      : "resend"
    : null;

  // ---- Overall ----
  let overall: Level = "ok";
  let overallReason = "Canonical Resend path healthy.";
  let remediation: string | null = null;
  if (apiLevel === "blocked") {
    overall = "blocked";
    overallReason = `Provider API blocked: ${apiDetail}`;
    remediation = "Reconnect the Resend connection in workspace connector settings (send-scoped key required).";
  } else if (acceptanceLevel !== "ok") {
    overall = acceptanceLevel === "unknown" ? "blocked" : "warn";
    overallReason = "No recent provider acceptance (no provider id returned in the last 72h).";
    remediation = "Run the selftest below and inspect the returned provider error.";
  } else if (lovableEmailsDisabled) {
    overall = "warn";
    overallReason =
      "Canonical Resend path is healthy, but the legacy Lovable Emails path is disabled for this project (403 emails_disabled).";
    remediation = "All outbound email must use outreach-resend-send. Lovable Emails is not used for recruitment.";
  }

  const out = {
    overall: { level: overall, reason: overallReason, remediation },
    configured_sender: {
      level: "ok" as Level,
      active: EXPECTED_SENDER,
      address: EXPECTED_ADDRESS,
      domain: EXPECTED_DOMAIN,
      note: "Configured string only — not proof of authorization.",
    },
    domain: { level: domainLevel, detail: domainDetail },
    api_request: {
      level: apiLevel,
      http_status: apiStatusCode,
      detail: apiDetail,
      route: apiRoute,
      key_prefix: resendKey.slice(0, 8) || null,
    },
    provider_acceptance: {
      level: acceptanceLevel,
      last_accepted_at: lastAcceptedAt,
      last_provider_id: lastProviderId,
      sender_used: acceptedSender,
    },
    delivery: {
      level: (bounced / total > 0.05 ? "warn" : "ok") as Level,
      delivery_rate: delivered / total,
      bounce_rate: bounced / total,
      failed_rate: failed / total,
      totals: { sent, delivered, bounced, failed, total: rows.length },
      window_days: 7,
    },
    last_failure: errRow
      ? {
          level: "warn" as Level,
          at: errRow.created_at,
          message: errMsg,
          status: errRow.status,
          template_name: errRow.template_name ?? null,
          channel: failureChannel,
        }
      : null,
    last_send_at: (lastSent as any).data?.created_at ?? null,
    last_selftest: lastSelftest.data ?? null,
    sender_mismatches: mismatches.data ?? [],
    health_state: healthState.data ?? null,

    // Back-compat fields (legacy consumers) — now derived from real acceptance.
    sender: { active: EXPECTED_SENDER, address: EXPECTED_ADDRESS, valid: domainLevel === "ok" },
    resend: {
      status: apiLevel === "ok" ? "ok" : apiLevel === "blocked" ? "auth_error" : "error",
      http_status: apiStatusCode,
    },
    last_success_at: lastAcceptedAt,
    last_error_at: errRow?.created_at ?? null,
    last_error: errMsg,
    last_resend_code: apiStatusCode,
    delivery_rate: delivered / total,
    bounce_rate: bounced / total,
    failed_rate: failed / total,
    window_days: 7,
    totals: { sent, delivered, bounced, failed, total: rows.length },
  };

  return new Response(JSON.stringify(out), { status: 200, headers: { ...cors, "Content-Type": "application/json" } });
});
