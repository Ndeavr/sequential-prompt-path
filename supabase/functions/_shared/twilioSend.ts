// PROTECTED — Single canonical Twilio sender. ALL outbound SMS must route through sendSms().
// Writes a full audit row to sms_events_v2 before/after the Twilio call so we never lose visibility.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { validateBeforeSend } from "./smsGuard.ts";
import { assertSendAllowed, isFounderModeActive, type MessageClass } from "./sendWindow.ts";

// Map sendSms message_type to the central send-window MessageClass.
function classifyMessage(type: string): MessageClass {
  switch (type) {
    case "otp":
    case "test":
      return "transactional";
    case "founder":
      return "system_alert";
    case "reengagement":
    case "onboarding":
      return "followup";
    case "outreach":
    default:
      return "prospection";
  }
}


const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID") ?? "";
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN") ?? "";
// Disable MessagingServiceSid path: we must enforce a specific QC sender.
const TWILIO_MESSAGING_SERVICE_SID = "";
// CANONICAL production sender. Hard-coded so a misconfigured env var cannot
// silently fall back to the US (574) number with messaging disabled.
const CANONICAL_FROM_NUMBER = "+14503286776";
const TWILIO_FROM_NUMBER = (Deno.env.get("TWILIO_FROM_NUMBER") ?? "").trim();
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
// Lovable connector-gateway fallback (used when direct creds absent)
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY") ?? "";
const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY") ?? "";
const GATEWAY_URL = "https://connector-gateway.lovable.dev/twilio";

const STATUS_CALLBACK_URL = `${SUPABASE_URL}/functions/v1/twilio-status`;
const TWILIO_MESSAGE_BASE = TWILIO_ACCOUNT_SID
  ? `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages`
  : "";

export type SendSmsInput = {
  to: string;
  body: string;
  message_type: "onboarding" | "reengagement" | "outreach" | "otp" | "founder" | "test" | "other" | string;
  template_key?: string;
  lead_id?: string;
  contractor_id?: string;
  campaign_id?: string;
  metadata?: Record<string, unknown>;
  attempt_number?: number;
  /**
   * Strict admin override — ONLY passed by admin/test edge functions.
   * When true AND destination is in ADMIN_SMS_ALLOWLIST, smsGuard bypasses
   * mobile-enforcement Lookup and returns phone_type=mobile_override.
   * Never set by production prospect outreach paths.
   */
  strict_admin_override?: boolean;
};

export type SendSmsResult = {
  event_id: string;
  status: string;
  twilio_sid: string | null;
  error_code?: string;
  error_message?: string;
};

async function hashBody(body: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(body));
  return Array.from(new Uint8Array(buf)).slice(0, 16).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function sendSms(input: SendSmsInput): Promise<SendSmsResult> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Send-window gate (skipped for transactional, OTP, founder bypass).
  const messageClass = classifyMessage(input.message_type);
  const founderBypass = await isFounderModeActive();
  const windowCheck = await assertSendAllowed({
    channel: "sms",
    messageClass,
    founderBypass,
  });
  if (!windowCheck.ok) {
    const body_hash_block = await hashBody(input.body);
    const { data: blocked } = await supabase
      .from("sms_events_v2")
      .insert({
        lead_id: input.lead_id ?? null,
        contractor_id: input.contractor_id ?? null,
        campaign_id: input.campaign_id ?? null,
        template_key: input.template_key ?? null,
        message_type: input.message_type,
        raw_phone: input.to,
        normalized_phone: input.to,
        from_number: TWILIO_FROM_NUMBER || null,
        message_preview: input.body.slice(0, 160),
        body_hash: body_hash_block,
        attempt_number: input.attempt_number ?? 1,
        status: "deferred_window",
        error_code: "OUT_OF_WINDOW",
        error_message: `Hors fenêtre — reprise prévue ${windowCheck.next_send_at}`,
        status_callback_url: STATUS_CALLBACK_URL,
        metadata: { ...(input.metadata ?? {}), next_send_at: windowCheck.next_send_at, send_window_blocked: true },
      })
      .select("id")
      .single();
    return {
      event_id: blocked?.id ?? "",
      status: "deferred_window",
      twilio_sid: null,
      error_code: "OUT_OF_WINDOW",
      error_message: `next_send_at=${windowCheck.next_send_at}`,
    };
  }

  const guard = await validateBeforeSend({
    supabase,
    phone: input.to,
    lead_id: input.lead_id ?? null,
    strict_admin_override: input.strict_admin_override === true,
  });
  const body_hash = await hashBody(input.body);
  const message_preview = input.body.slice(0, 160);


  // Insert audit row up-front so we always have a trace.
  const baseRow = {
    lead_id: input.lead_id ?? null,
    contractor_id: input.contractor_id ?? null,
    campaign_id: input.campaign_id ?? null,
    template_key: input.template_key ?? null,
    message_type: input.message_type,
    raw_phone: input.to,
    normalized_phone: guard.ok ? guard.normalized : guard.normalized,
    country_code: guard.ok ? guard.country_code : null,
    area_code: guard.ok ? guard.area_code : null,
    from_number: TWILIO_FROM_NUMBER || null,
    message_preview,
    body_hash,
    attempt_number: input.attempt_number ?? 1,
    status_callback_url: STATUS_CALLBACK_URL,
    metadata: input.metadata ?? {},
  };

  if (!guard.ok) {
    const { data: row } = await supabase
      .from("sms_events_v2")
      .insert({ ...baseRow, status: guard.reason, error_message: guard.detail, failed_at: new Date().toISOString() })
      .select("id")
      .single();
    // Admin alert (best-effort)
    try {
      await supabase.from("admin_notifications").insert({
        type: "sms_blocked",
        title: "SMS blocked",
        body: `Phone ${input.to} → ${guard.reason} (${guard.detail})`,
        severity: "warning",
        payload_json: { event_id: row?.id, reason: guard.reason, phone: input.to },
      });
    } catch (_) { /* swallow */ }
    return { event_id: row?.id ?? "", status: guard.reason, twilio_sid: null, error_message: guard.detail };
  }

  const { data: queued, error: qErr } = await supabase
    .from("sms_events_v2")
    .insert({ ...baseRow, status: "queued" })
    .select("id")
    .single();
  if (qErr || !queued) {
    return { event_id: "", status: "failed", twilio_sid: null, error_message: `audit_insert_failed: ${qErr?.message}` };
  }

  // ── HARD BLOCK: sender must match canonical QC number ────────────────
  if (TWILIO_FROM_NUMBER !== CANONICAL_FROM_NUMBER) {
    const msg = `Wrong Twilio sender configured. Expected ${CANONICAL_FROM_NUMBER}. Current: ${TWILIO_FROM_NUMBER || "(unset)"}`;
    await supabase.from("sms_events_v2").update({
      status: "failed", error_code: "WRONG_SENDER", error_message: msg, failed_at: new Date().toISOString(),
      provider_response: { blocked: true, expected_from: CANONICAL_FROM_NUMBER, env_from: TWILIO_FROM_NUMBER },
    }).eq("id", queued.id);
    return { event_id: queued.id, status: "failed", twilio_sid: null, error_code: "WRONG_SENDER", error_message: msg };
  }
  if (!STATUS_CALLBACK_URL || !STATUS_CALLBACK_URL.includes("/functions/v1/twilio-status")) {
    const msg = "SMS delivery tracking is not configured. Fix Twilio status webhook before sending.";
    await supabase.from("sms_events_v2").update({
      status: "failed", error_code: "STATUS_CALLBACK_MISSING", error_message: msg, failed_at: new Date().toISOString(),
      provider_response: { blocked: true, status_callback_url: STATUS_CALLBACK_URL },
    }).eq("id", queued.id);
    return { event_id: queued.id, status: "failed", twilio_sid: null, error_code: "STATUS_CALLBACK_MISSING", error_message: msg };
  }

  const useGateway = (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) && LOVABLE_API_KEY && TWILIO_API_KEY;
  if (!TWILIO_ACCOUNT_SID && !useGateway) {
    await supabase.from("sms_events_v2").update({
      status: "failed", error_code: "config", error_message: "twilio_not_configured", failed_at: new Date().toISOString(),
      provider_response: { blocked: true, reason: "missing_twilio_credentials" },
    }).eq("id", queued.id);
    return { event_id: queued.id, status: "failed", twilio_sid: null, error_message: "twilio_not_configured" };
  }

  const form = new URLSearchParams({ To: guard.normalized, Body: input.body, StatusCallback: STATUS_CALLBACK_URL });
  form.set("From", CANONICAL_FROM_NUMBER);

  const url = useGateway
    ? `${GATEWAY_URL}/Messages.json`
    : `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
  const headers: Record<string, string> = useGateway
    ? { Authorization: `Bearer ${LOVABLE_API_KEY}`, "X-Connection-Api-Key": TWILIO_API_KEY, "Content-Type": "application/x-www-form-urlencoded" }
    : { Authorization: `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`, "Content-Type": "application/x-www-form-urlencoded" };

  let twResp: Response;
  try {
    twResp = await fetch(url, { method: "POST", headers, body: form.toString() });
  } catch (e) {
    await supabase.from("sms_events_v2").update({
      status: "failed", error_code: "network", error_message: String(e), failed_at: new Date().toISOString(),
      provider_response: { network_error: String(e), status_callback_url: STATUS_CALLBACK_URL },
    }).eq("id", queued.id);
    return { event_id: queued.id, status: "failed", twilio_sid: null, error_message: String(e) };
  }

  const tw = await twResp.json().catch(() => ({}));
  if (!twResp.ok) {
    await supabase.from("sms_events_v2").update({
      status: "failed",
      error_code: String(tw.code ?? twResp.status),
      error_message: tw.message ?? `HTTP ${twResp.status}`,
      failed_at: new Date().toISOString(),
      provider_response: { http_status: twResp.status, body: tw, status_callback_url: STATUS_CALLBACK_URL },
    }).eq("id", queued.id);
    return { event_id: queued.id, status: "failed", twilio_sid: null, error_code: String(tw.code ?? twResp.status), error_message: tw.message };
  }

  await supabase.from("sms_events_v2").update({
    status: "sending",
    twilio_sid: tw.sid,
    sent_at: new Date().toISOString(),
    provider_response: { http_status: twResp.status, body: tw, status_callback_url: STATUS_CALLBACK_URL },
    twilio_status_url: tw.sid && TWILIO_MESSAGE_BASE ? `${TWILIO_MESSAGE_BASE}/${tw.sid}.json` : null,
  }).eq("id", queued.id);

  try {
    await supabase.from("message_events").insert({
      channel: "sms",
      provider: "twilio",
      provider_message_id: tw.sid ?? null,
      message_event_type: "api_accepted",
      status: tw.status ?? "queued",
      source_table: "sms_events_v2",
      source_row_id: queued.id,
      payload: { to: guard.normalized, from: CANONICAL_FROM_NUMBER, status_callback_url: STATUS_CALLBACK_URL, twilio_response: tw },
    });
  } catch (_) { /* best effort */ }

  return { event_id: queued.id, status: "sending", twilio_sid: tw.sid ?? null };
}
