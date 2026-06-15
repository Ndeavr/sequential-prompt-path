// PROTECTED — Single canonical Twilio sender. ALL outbound SMS must route through sendSms().
// Writes a full audit row to sms_events_v2 before/after the Twilio call so we never lose visibility.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { validateBeforeSend } from "./smsGuard.ts";

const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID") ?? "";
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN") ?? "";
const TWILIO_MESSAGING_SERVICE_SID = Deno.env.get("TWILIO_MESSAGING_SERVICE_SID") ?? "";
const TWILIO_FROM_NUMBER = Deno.env.get("TWILIO_FROM_NUMBER") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const STATUS_CALLBACK_URL = `${SUPABASE_URL.replace("supabase.co", "functions.supabase.co")}/functions/v1/twilio-status-v2`;

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

  const guard = await validateBeforeSend({ supabase, phone: input.to });
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

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    await supabase.from("sms_events_v2").update({
      status: "failed", error_code: "config", error_message: "twilio_not_configured", failed_at: new Date().toISOString(),
    }).eq("id", queued.id);
    return { event_id: queued.id, status: "failed", twilio_sid: null, error_message: "twilio_not_configured" };
  }

  const form = new URLSearchParams({ To: guard.normalized, Body: input.body, StatusCallback: STATUS_CALLBACK_URL });
  if (TWILIO_MESSAGING_SERVICE_SID) form.set("MessagingServiceSid", TWILIO_MESSAGING_SERVICE_SID);
  else if (TWILIO_FROM_NUMBER) form.set("From", TWILIO_FROM_NUMBER);

  const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
  let twResp: Response;
  try {
    twResp = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`, {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });
  } catch (e) {
    await supabase.from("sms_events_v2").update({
      status: "failed", error_code: "network", error_message: String(e), failed_at: new Date().toISOString(),
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
    }).eq("id", queued.id);
    return { event_id: queued.id, status: "failed", twilio_sid: null, error_code: String(tw.code ?? twResp.status), error_message: tw.message };
  }

  await supabase.from("sms_events_v2").update({
    status: "sending", twilio_sid: tw.sid, sent_at: new Date().toISOString(),
  }).eq("id", queued.id);

  return { event_id: queued.id, status: "sending", twilio_sid: tw.sid ?? null };
}
