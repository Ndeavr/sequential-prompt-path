// Twilio E2E Audit — traces the entire SMS pipeline step by step.
// Each step is isolated and continues past failures so we always get a full picture.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { sendSms } from "../_shared/twilioSend.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Status = "pass" | "fail" | "warn";
type Step = {
  step: number;
  name: string;
  status: Status;
  latency_ms: number;
  http_status?: number;
  twilio_code?: string | number;
  request?: unknown;
  response?: unknown;
  error?: string;
  note?: string;
};

const CANONICAL_FROM = "+14503286776";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const trace: Step[] = [];
  const t0 = (s: number) => Math.max(0, Date.now() - s);
  const push = (s: Step) => { trace.push(s); return s; };

  const body = await req.json().catch(() => ({} as any));

  // Step 1 — frontend_invoke
  push({ step: 1, name: "frontend_invoke", status: "pass", latency_ms: 0, request: body, note: "Edge function reached" });

  // Step 2 — admin_auth
  const sAuth = Date.now();
  const authHeader = req.headers.get("Authorization") ?? "";
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  let userId: string | null = null;
  if (!authHeader.startsWith("Bearer ")) {
    push({ step: 2, name: "admin_auth", status: "fail", latency_ms: t0(sAuth), error: "missing_bearer" });
  } else {
    try {
      const sb = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
      const { data: u } = await sb.auth.getUser(authHeader.replace("Bearer ", ""));
      userId = u?.user?.id ?? null;
      if (!userId) throw new Error("no_user");
      const { data: role } = await admin.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
      if (!role) {
        push({ step: 2, name: "admin_auth", status: "fail", latency_ms: t0(sAuth), error: "not_admin", response: { user_id: userId } });
      } else {
        push({ step: 2, name: "admin_auth", status: "pass", latency_ms: t0(sAuth), response: { user_id: userId, role: "admin" } });
      }
    } catch (e) {
      push({ step: 2, name: "admin_auth", status: "fail", latency_ms: t0(sAuth), error: String((e as Error).message) });
    }
  }

  // Gate further steps on admin OK
  const adminStep = trace.find((s) => s.name === "admin_auth")!;
  if (adminStep.status !== "pass") {
    return json({ ok: false, verdict: verdict(trace), trace });
  }

  // Step 3 — secrets_present
  const sSec = Date.now();
  const secrets: Record<string, boolean> = {
    TWILIO_ACCOUNT_SID: !!Deno.env.get("TWILIO_ACCOUNT_SID"),
    TWILIO_AUTH_TOKEN: !!Deno.env.get("TWILIO_AUTH_TOKEN"),
    TWILIO_FROM_NUMBER: !!Deno.env.get("TWILIO_FROM_NUMBER"),
    SUPABASE_SERVICE_ROLE_KEY: !!SERVICE_KEY,
    ADMIN_TEST_PHONE: !!Deno.env.get("ADMIN_TEST_PHONE"),
  };
  const missing = Object.entries(secrets).filter(([, v]) => !v).map(([k]) => k);
  push({
    step: 3, name: "secrets_present",
    status: missing.length === 0 ? "pass" : (missing.includes("ADMIN_TEST_PHONE") && missing.length === 1 ? "warn" : "fail"),
    latency_ms: t0(sSec),
    response: { secrets, missing },
    error: missing.length ? `missing: ${missing.join(", ")}` : undefined,
  });

  // Step 4 — db_write_permission (probe insert + delete)
  const sDb = Date.now();
  let probeId: string | null = null;
  try {
    const { data, error } = await admin.from("sms_events_v2").insert({
      message_type: "audit_probe",
      raw_phone: "+10000000000",
      normalized_phone: "+10000000000",
      status: "audit_probe",
      attempt_number: 1,
      metadata: { source: "twilio-e2e-audit", user_id: userId },
    }).select("id").single();
    if (error || !data?.id) throw new Error(error?.message || "no_id");
    probeId = data.id;
    await admin.from("sms_events_v2").delete().eq("id", probeId);
    push({ step: 4, name: "db_write_permission", status: "pass", latency_ms: t0(sDb), response: { probe_event_id: probeId } });
  } catch (e) {
    push({ step: 4, name: "db_write_permission", status: "fail", latency_ms: t0(sDb), error: String((e as Error).message),
      note: "service_role cannot insert sms_events_v2 — sendSms will return empty event_id" });
  }

  // Step 5 — twilio_auth
  const sid = Deno.env.get("TWILIO_ACCOUNT_SID") ?? "";
  const tok = Deno.env.get("TWILIO_AUTH_TOKEN") ?? "";
  const basic = sid && tok ? "Basic " + btoa(`${sid}:${tok}`) : null;
  const sAuthTw = Date.now();
  if (!basic) {
    push({ step: 5, name: "twilio_auth", status: "fail", latency_ms: t0(sAuthTw), error: "missing_sid_or_token" });
  } else {
    try {
      const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}.json`, { headers: { Authorization: basic } });
      const txt = await r.text();
      let parsed: any = null; try { parsed = JSON.parse(txt); } catch { /* ignore */ }
      push({
        step: 5, name: "twilio_auth",
        status: r.ok ? "pass" : "fail",
        latency_ms: t0(sAuthTw), http_status: r.status,
        twilio_code: parsed?.code,
        response: { friendly_name: parsed?.friendly_name, status: parsed?.status, error: parsed?.message },
        error: r.ok ? undefined : (parsed?.message || `HTTP ${r.status}`),
      });
    } catch (e) {
      push({ step: 5, name: "twilio_auth", status: "fail", latency_ms: t0(sAuthTw), error: String((e as Error).message) });
    }
  }

  // Step 6 — from_number_owned
  const sFrom = Date.now();
  if (!basic) {
    push({ step: 6, name: "from_number_owned", status: "fail", latency_ms: t0(sFrom), error: "no_auth" });
  } else {
    try {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/IncomingPhoneNumbers.json?PhoneNumber=${encodeURIComponent(CANONICAL_FROM)}`;
      const r = await fetch(url, { headers: { Authorization: basic } });
      const data = await r.json().catch(() => ({} as any));
      const owned = Array.isArray(data?.incoming_phone_numbers) && data.incoming_phone_numbers.length > 0;
      const envFrom = (Deno.env.get("TWILIO_FROM_NUMBER") ?? "").trim();
      const matches = envFrom === CANONICAL_FROM;
      push({
        step: 6, name: "from_number_owned",
        status: owned && matches ? "pass" : "fail",
        latency_ms: t0(sFrom), http_status: r.status,
        response: {
          canonical_from: CANONICAL_FROM,
          env_from: envFrom,
          env_matches_canonical: matches,
          owned_in_account: owned,
          number_sid: data?.incoming_phone_numbers?.[0]?.sid,
          capabilities: data?.incoming_phone_numbers?.[0]?.capabilities,
        },
        error: !owned ? "number_not_in_account" : (!matches ? `env_from_mismatch (got ${envFrom || "unset"})` : undefined),
      });
    } catch (e) {
      push({ step: 6, name: "from_number_owned", status: "fail", latency_ms: t0(sFrom), error: String((e as Error).message) });
    }
  }

  // Step 7 — status_callback_reachable
  const sCb = Date.now();
  const callbackUrl = `${SUPABASE_URL}/functions/v1/twilio-status`;
  try {
    const r = await fetch(callbackUrl, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: "MessageSid=AUDIT_PROBE&MessageStatus=ping" });
    // Webhook may return 2xx or 4xx for invalid body — what matters is the function responds.
    const reachable = r.status < 500;
    push({
      step: 7, name: "status_callback_reachable",
      status: reachable ? "pass" : "fail",
      latency_ms: t0(sCb), http_status: r.status,
      request: { url: callbackUrl, method: "POST" },
      response: { status: r.status, note: "POST probe — 4xx is OK (means handler is alive)" },
      error: reachable ? undefined : `HTTP ${r.status}`,
    });
  } catch (e) {
    push({ step: 7, name: "status_callback_reachable", status: "fail", latency_ms: t0(sCb), error: String((e as Error).message), request: { url: callbackUrl } });
  }

  // Step 8 — real_send
  const to = (body?.to as string) || Deno.env.get("ADMIN_TEST_PHONE") || "";
  const sSend = Date.now();
  let realEventId: string | null = null;
  let realSid: string | null = null;
  if (!to) {
    push({ step: 8, name: "real_send", status: "warn", latency_ms: t0(sSend), error: "no_destination", note: "Set ADMIN_TEST_PHONE or pass { to: '+1…' }" });
  } else {
    try {
      const result = await sendSms({
        to,
        body: `UNPRO E2E audit ${new Date().toLocaleTimeString("fr-CA")}. Si vous lisez ceci, le pipeline fonctionne.`,
        message_type: "test",
        template_key: "twilio_e2e_audit",
        metadata: { source: "twilio-e2e-audit", user_id: userId },
      });
      realEventId = result.event_id || null;
      realSid = result.twilio_sid;
      const ok = !!realEventId && (result.status === "queued" || result.status === "sent" || result.status === "delivered");
      push({
        step: 8, name: "real_send",
        status: ok ? "pass" : "fail",
        latency_ms: t0(sSend),
        request: { to, from: CANONICAL_FROM, callback: callbackUrl },
        response: { event_id: realEventId, twilio_sid: realSid, status: result.status, error_code: result.error_code, error_message: result.error_message },
        twilio_code: result.error_code,
        error: ok ? undefined : (result.error_message || result.status),
      });
    } catch (e) {
      push({ step: 8, name: "real_send", status: "fail", latency_ms: t0(sSend), error: String((e as Error).message) });
    }
  }

  // Step 9 — poll_callback (up to 60s)
  const sPoll = Date.now();
  if (!realEventId) {
    push({ step: 9, name: "poll_callback", status: "fail", latency_ms: t0(sPoll), error: "no_event_id_from_step_8" });
  } else {
    let final: any = null;
    const deadline = Date.now() + 60_000;
    while (Date.now() < deadline) {
      const { data } = await admin.from("sms_events_v2")
        .select("status,error_code,error_message,sent_at,delivered_at,failed_at,webhook_received_at,twilio_sid")
        .eq("id", realEventId).maybeSingle();
      if (data && ["delivered", "sent", "failed", "undelivered", "blocked", "invalid_phone"].includes(data.status)) {
        final = data; break;
      }
      await new Promise((r) => setTimeout(r, 2000));
    }
    if (!final) {
      push({ step: 9, name: "poll_callback", status: "warn", latency_ms: t0(sPoll), error: "timeout_60s", note: "Twilio webhook never updated the row" });
    } else {
      const ok = final.status === "delivered" || (final.status === "sent" && !!final.webhook_received_at);
      push({
        step: 9, name: "poll_callback",
        status: ok ? "pass" : (final.status === "sent" ? "warn" : "fail"),
        latency_ms: t0(sPoll),
        response: final,
        error: ok ? undefined : (final.error_message || final.status),
      });
    }
  }

  // Step 10 — dashboard_reads
  const sDash = Date.now();
  try {
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { data, error } = await admin.from("sms_events_v2")
      .select("status").gte("created_at", since);
    if (error) throw error;
    const rollup: Record<string, number> = {};
    for (const r of data ?? []) rollup[r.status] = (rollup[r.status] ?? 0) + 1;
    const includesMe = realEventId
      ? !!(await admin.from("sms_events_v2").select("id").eq("id", realEventId).maybeSingle()).data
      : false;
    push({
      step: 10, name: "dashboard_reads",
      status: realEventId ? (includesMe ? "pass" : "fail") : "warn",
      latency_ms: t0(sDash),
      response: { window: "24h", total: data?.length ?? 0, rollup, test_event_in_dashboard: includesMe },
      error: realEventId && !includesMe ? "test_event_missing_from_aggregate" : undefined,
    });
  } catch (e) {
    push({ step: 10, name: "dashboard_reads", status: "fail", latency_ms: t0(sDash), error: String((e as Error).message) });
  }

  return json({ ok: trace.every((s) => s.status !== "fail"), verdict: verdict(trace), trace });
});

function verdict(trace: Step[]): { code: string; failing_step?: number; failing_name?: string; next_action: string } {
  const first = trace.find((s) => s.status === "fail");
  if (!first) {
    const warn = trace.find((s) => s.status === "warn");
    if (warn) return { code: `WARN_${warn.name.toUpperCase()}`, failing_step: warn.step, failing_name: warn.name, next_action: warn.error || warn.note || "Investigate warning" };
    return { code: "HEALTHY", next_action: "SMS pipeline fully operational" };
  }
  const map: Record<string, string> = {
    frontend_invoke: "FRONTEND_UNREACHABLE",
    admin_auth: "NOT_ADMIN",
    secrets_present: "SECRET_MISSING",
    db_write_permission: "DB_INSERT_BLOCKED",
    twilio_auth: "TWILIO_AUTH_FAILED",
    from_number_owned: "FROM_NUMBER_NOT_IN_ACCOUNT",
    status_callback_reachable: "STATUS_CALLBACK_UNREACHABLE",
    real_send: "TWILIO_SEND_REJECTED",
    poll_callback: "CALLBACK_NEVER_FIRED",
    dashboard_reads: "DASHBOARD_QUERY_MISMATCH",
  };
  const code = map[first.name] ?? "UNKNOWN";
  return {
    code: first.twilio_code ? `${code}:${first.twilio_code}` : code,
    failing_step: first.step,
    failing_name: first.name,
    next_action: first.error || first.note || "See trace for details",
  };
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload, null, 2), { status, headers: { ...cors, "Content-Type": "application/json" } });
}
