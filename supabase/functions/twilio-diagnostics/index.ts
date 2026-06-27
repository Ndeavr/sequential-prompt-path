// UNPRO — Twilio production audit + smoke test for /admin/revenue-intelligence.
// GET  → validates credentials, sender ownership/capabilities, services, webhooks, live Twilio logs, local SMS events.
// POST → sends a smoke-test SMS through the canonical sender and returns the Twilio SID/API response/status trace.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { sendSms } from "../_shared/twilioSend.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const CANONICAL_FROM = "+14503286776";
const BLOCKED_FROM = "+15745405938";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SRK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID") ?? "";
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN") ?? "";
const TWILIO_FROM_NUMBER = (Deno.env.get("TWILIO_FROM_NUMBER") ?? "").trim();
const TWILIO_PHONE_NUMBER = (Deno.env.get("TWILIO_PHONE_NUMBER") ?? "").trim();
const TWILIO_MESSAGING_SERVICE_SID = (Deno.env.get("TWILIO_MESSAGING_SERVICE_SID") ?? "").trim();
const TWILIO_VERIFY_SERVICE_SID = (Deno.env.get("TWILIO_VERIFY_SERVICE_SID") ?? "").trim();
const ADMIN_TEST_PHONE = (Deno.env.get("ADMIN_TEST_PHONE") ?? "").trim();

const inboundUrl = `${SUPABASE_URL}/functions/v1/twilio-inbound`;
const statusUrl = `${SUPABASE_URL}/functions/v1/twilio-status`;
const canonicalV2StatusUrl = `${SUPABASE_URL}/functions/v1/twilio-status-v2`;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

function normalizeE164(raw: string): string {
  const v = String(raw ?? "").trim();
  if (!v) return "";
  if (v.startsWith("+")) return v;
  const digits = v.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return digits ? `+${digits}` : "";
}

function maskSid(sid: string): string {
  if (!sid) return "missing";
  return `${sid.slice(0, 4)}…${sid.slice(-4)}`;
}

function safeObject(value: unknown) {
  if (!value || typeof value !== "object") return {};
  return value as Record<string, unknown>;
}

async function twilioFetch(url: string, init: RequestInit = {}): Promise<{ ok: boolean; status: number; body: any; url: string }> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    return { ok: false, status: 0, body: { code: "TWILIO_CREDS_MISSING", message: "TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN missing" }, url };
  }
  try {
    const r = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
        ...(init.headers ?? {}),
      },
    });
    const body = await r.json().catch(() => ({}));
    return { ok: r.ok, status: r.status, body, url };
  } catch (e) {
    return { ok: false, status: 0, body: { code: "NETWORK", message: String(e) }, url };
  }
}

function twilio2010(path: string, init: RequestInit = {}) {
  return twilioFetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}${path}`, init);
}

function twilioMessaging(path: string, init: RequestInit = {}) {
  return twilioFetch(`https://messaging.twilio.com/v1${path}`, init);
}

function twilioVerify(path: string, init: RequestInit = {}) {
  return twilioFetch(`https://verify.twilio.com/v2${path}`, init);
}

async function loadAccountInfo() {
  const res = await twilioFetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}.json`);
  if (!res.ok) {
    return {
      ok: false,
      http_status: res.status,
      error_code: res.body?.code ?? null,
      error_message: res.body?.message ?? "Twilio account check failed",
    };
  }
  return {
    ok: true,
    sid: maskSid(res.body?.sid ?? TWILIO_ACCOUNT_SID),
    status: res.body?.status ?? null,
    type: res.body?.type ?? null,
    friendly_name: res.body?.friendly_name ?? null,
  };
}

async function loadNumberInfo() {
  const list = await twilio2010(`/IncomingPhoneNumbers.json?PhoneNumber=${encodeURIComponent(CANONICAL_FROM)}`);
  if (!list.ok) {
    return {
      available: false,
      reason: list.status === 401 ? "twilio_auth_failed" : "twilio_number_lookup_failed",
      http_status: list.status,
      error_code: list.body?.code ?? null,
      error_message: list.body?.message ?? null,
    };
  }
  const match = list.body?.incoming_phone_numbers?.[0];
  if (!match) return { available: false, reason: "number_not_found_in_account" };
  return {
    available: true,
    sid: maskSid(match.sid ?? ""),
    raw_sid: match.sid ?? null,
    phone_number: match.phone_number,
    friendly_name: match.friendly_name,
    country: match.iso_country ?? null,
    sms_enabled: !!match.capabilities?.sms,
    mms_enabled: !!match.capabilities?.mms,
    voice_enabled: !!match.capabilities?.voice,
    sms_url: match.sms_url,
    sms_method: match.sms_method,
    status_callback: match.status_callback,
  };
}

async function loadMessagingServiceInfo(numberRawSid: string | null) {
  if (!TWILIO_MESSAGING_SERVICE_SID) {
    return { configured: false, used_by_unpro: false, note: "UNPRO sends with the fixed From number, not MessagingServiceSid." };
  }
  const svc = await twilioMessaging(`/Services/${TWILIO_MESSAGING_SERVICE_SID}`);
  const numbers = svc.ok ? await twilioMessaging(`/Services/${TWILIO_MESSAGING_SERVICE_SID}/PhoneNumbers?PageSize=50`) : null;
  const attached = !!numberRawSid && !!numbers?.body?.phone_numbers?.some((n: any) => n.phone_number === CANONICAL_FROM || n.sid === numberRawSid);
  return {
    configured: true,
    used_by_unpro: false,
    sid: maskSid(TWILIO_MESSAGING_SERVICE_SID),
    ok: svc.ok,
    http_status: svc.status,
    friendly_name: svc.body?.friendly_name ?? null,
    inbound_request_url: svc.body?.inbound_request_url ?? null,
    status_callback: svc.body?.status_callback ?? null,
    sender_attached: attached,
    sender_count: numbers?.body?.phone_numbers?.length ?? 0,
    error_message: svc.ok ? null : svc.body?.message ?? "Messaging Service check failed",
  };
}

async function loadVerifyInfo() {
  if (!TWILIO_VERIFY_SERVICE_SID) return { configured: false };
  const res = await twilioVerify(`/Services/${TWILIO_VERIFY_SERVICE_SID}`);
  return {
    configured: true,
    sid: maskSid(TWILIO_VERIFY_SERVICE_SID),
    ok: res.ok,
    http_status: res.status,
    friendly_name: res.body?.friendly_name ?? null,
    error_message: res.ok ? null : res.body?.message ?? "Verify Service check failed",
  };
}

async function edgeReachable(url: string) {
  try {
    const r = await fetch(url, { method: "OPTIONS" });
    return { ok: r.ok, status: r.status };
  } catch (e) {
    return { ok: false, status: 0, error: String(e) };
  }
}

async function loadTwilioMessages(limit = 25) {
  const res = await twilio2010(`/Messages.json?PageSize=${limit}&From=${encodeURIComponent(CANONICAL_FROM)}`);
  if (!res.ok) {
    return { ok: false, http_status: res.status, error_message: res.body?.message ?? "Message log check failed", messages: [] };
  }
  return {
    ok: true,
    messages: (res.body?.messages ?? []).map((m: any) => ({
      sid: m.sid,
      to: m.to,
      from: m.from,
      status: m.status,
      error_code: m.error_code,
      error_message: m.error_message,
      direction: m.direction,
      date_created: m.date_created,
      date_sent: m.date_sent,
      price: m.price,
      uri: m.uri,
    })),
  };
}

function diagnose(args: {
  senderOk: boolean;
  account: any;
  numberInfo: any;
  inboundReachable: any;
  statusReachable: any;
  dbTotals: any;
}) {
  const blockers: string[] = [];
  const warnings: string[] = [];
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) blockers.push("TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN missing.");
  if (!args.account?.ok) blockers.push(`Twilio credentials rejected or unreachable (${args.account?.error_message ?? "account check failed"}).`);
  if (!args.senderOk) blockers.push(`TWILIO_FROM_NUMBER must be ${CANONICAL_FROM}; current=${TWILIO_FROM_NUMBER || "unset"}.`);
  if (!args.numberInfo?.available) blockers.push(`Active sender ${CANONICAL_FROM} is not found in the authenticated Twilio account (${args.numberInfo?.reason}).`);
  if (args.numberInfo?.available && !args.numberInfo?.sms_enabled) blockers.push(`Active sender ${CANONICAL_FROM} exists but SMS capability is disabled.`);
  if (!args.statusReachable?.ok) blockers.push(`Status callback is not reachable: ${statusUrl}.`);
  if (!args.inboundReachable?.ok) warnings.push(`Inbound webhook is not reachable: ${inboundUrl}.`);
  if (args.numberInfo?.available && args.numberInfo?.sms_url && args.numberInfo.sms_url !== inboundUrl) {
    warnings.push(`Twilio Incoming SMS webhook is ${args.numberInfo.sms_url || "empty"}; expected ${inboundUrl}.`);
  }
  const e30006 = Number(args.dbTotals?.error_30006 ?? 0);
  if (e30006 > 0) warnings.push(`${e30006} messages have Twilio error 30006: destination handset unreachable/landline/carrier cannot deliver; these must not count as silent app failures.`);
  const delivered = Number(args.dbTotals?.delivered ?? 0);
  const webhooks = Number(args.dbTotals?.webhooks ?? 0);
  if (webhooks > 0 && delivered > 0) warnings.push(`Delivery webhooks are arriving (${webhooks}) and at least ${delivered} messages are marked delivered in sms_events_v2.`);
  return {
    status: blockers.length ? "blocked" : warnings.length ? "warning" : "green",
    root_cause: blockers[0] ?? warnings[0] ?? "Twilio production SMS path is healthy.",
    blockers,
    warnings,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const sb = createClient(SUPABASE_URL, SRK, { auth: { autoRefreshToken: false, persistSession: false } });

  try {
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const to = normalizeE164(String(body.to || ADMIN_TEST_PHONE || "").trim());
      if (!to) return json({ ok: false, error: "missing_to" }, 400);
      const trackerId = `tw_${crypto.randomUUID().replace(/-/g, "").slice(0, 18)}`;
      await sb.from("acquisition_tracking_links").insert({
        id: trackerId,
        destination_url: "https://unpro.ca/pro",
        channel: "sms",
        campaign: "twilio_smoke_test",
        metadata: { source: "twilio-diagnostics", smoke: true, to },
      });
      const result = await sendSms({
        to,
        body: body.message || `UNPRO smoke test — ${new Date().toLocaleString("fr-CA")}. Répondez OUI pour confirmer la réception. https://unpro.ca/r/${trackerId}`,
        message_type: "test",
        template_key: "admin_smoke_test",
        metadata: { source: "twilio-diagnostics", smoke: true, tracking_id: trackerId, contact_id: body.contact_id ?? null },
      });
      let liveStatus: any = null;
      if (result.twilio_sid) {
        const live = await twilio2010(`/Messages/${result.twilio_sid}.json`);
        liveStatus = live.ok ? {
          sid: live.body?.sid,
          status: live.body?.status,
          error_code: live.body?.error_code,
          error_message: live.body?.error_message,
          to: live.body?.to,
          from: live.body?.from,
          date_created: live.body?.date_created,
          date_sent: live.body?.date_sent,
        } : { ok: false, http_status: live.status, error_message: live.body?.message };
      }
      return json({ ok: result.status !== "failed", result, live_status: liveStatus, tracking_url: `https://unpro.ca/r/${trackerId}`, trace: ["UNPRO", "twilio-diagnostics", "sendSms", "Twilio Messages API", liveStatus?.status ?? result.status] });
    }

    // GET → diagnostics snapshot
    const fromEnv = TWILIO_FROM_NUMBER || "(unset)";
    const senderOk = TWILIO_FROM_NUMBER === CANONICAL_FROM;
    const [account, numberInfo, inboundReachable, statusReachable, v2Reachable, dbTotalsRes] = await Promise.all([
      loadAccountInfo(),
      loadNumberInfo(),
      edgeReachable(inboundUrl),
      edgeReachable(statusUrl),
      edgeReachable(canonicalV2StatusUrl),
      sb.from("sms_events_v2").select("status,error_code,sent_at,delivered_at,failed_at,webhook_received_at", { count: "exact" }),
    ]);
    const [messagingService, verifyService, twilioMessages] = await Promise.all([
      loadMessagingServiceInfo((numberInfo as any)?.raw_sid ?? null),
      loadVerifyInfo(),
      loadTwilioMessages(25),
    ]);

    const rows = dbTotalsRes.data ?? [];
    const dbTotals = {
      total: rows.length,
      api_sent: rows.filter((r: any) => !!r.sent_at || ["sending", "sent", "delivered", "undelivered", "failed", "retry_scheduled", "contact_required"].includes(r.status)).length,
      delivered: rows.filter((r: any) => !!r.delivered_at || r.status === "delivered").length,
      failed: rows.filter((r: any) => !!r.failed_at || ["failed", "undelivered", "retry_scheduled", "contact_required"].includes(r.status)).length,
      webhooks: rows.filter((r: any) => !!r.webhook_received_at).length,
      error_30006: rows.filter((r: any) => r.error_code === "30006").length,
      invalid_phone: rows.filter((r: any) => r.status === "invalid_phone").length,
    };
    const diagnosis = diagnose({ senderOk, account, numberInfo, inboundReachable, statusReachable, dbTotals });

    const { data: recent } = await sb
      .from("sms_events_v2")
      .select("id,twilio_sid,status,from_number,raw_phone,normalized_phone,template_key,campaign_id,contractor_id,message_preview,error_code,error_message,sent_at,delivered_at,failed_at,webhook_received_at,clicked_at,created_at,metadata,provider_response,status_callback_url,twilio_status_url,twilio_status_checked_at")
      .order("created_at", { ascending: false })
      .limit(25);

    const counts: Record<string, number> = {};
    (recent || []).forEach((r: any) => { counts[r.status] = (counts[r.status] || 0) + 1; });

    return json({
      ok: true,
      sender: {
        account_sid_present: !!TWILIO_ACCOUNT_SID,
        account_sid_masked: maskSid(TWILIO_ACCOUNT_SID),
        auth_token_present: !!TWILIO_AUTH_TOKEN,
        env_value: fromEnv,
        legacy_phone_number_env: TWILIO_PHONE_NUMBER ? normalizeE164(TWILIO_PHONE_NUMBER) : "(unset)",
        canonical: CANONICAL_FROM,
        blocked_us_number: BLOCKED_FROM,
        env_matches_canonical: senderOk,
        status_callback_url: statusUrl,
        canonical_status_callback_url: canonicalV2StatusUrl,
        inbound_webhook_url: inboundUrl,
      },
      account,
      twilio_number: numberInfo,
      messaging_service: messagingService,
      verify_service: verifyService,
      edge_callbacks: { inbound: inboundReachable, status: statusReachable, status_v2: v2Reachable },
      diagnosis,
      db_totals: dbTotals,
      twilio_messages: twilioMessages,
      recent_count: recent?.length ?? 0,
      status_breakdown: counts,
      recent_messages: recent ?? [],
    });
  } catch (e) {
    return json({ ok: false, error: String(e) }, 200);
  }
});
