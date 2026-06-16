// UNPRO — Unified Twilio delivery status webhook. Updates sms_events_v2 by MessageSid.
// Configure Twilio Messaging Service "Status callback URL" to this function.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-twilio-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function mapStatus(twilio: string): string {
  switch (twilio) {
    case "queued": return "queued";
    case "sending": return "sending";
    case "sent": return "sent";
    case "delivered": return "delivered";
    case "undelivered": return "undelivered";
    case "failed": return "failed";
    default: return twilio || "queued";
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const ct = req.headers.get("content-type") ?? "";
    let params: URLSearchParams;
    if (ct.includes("application/json")) {
      const j = await req.json();
      params = new URLSearchParams(j as Record<string, string>);
    } else {
      const text = await req.text();
      params = new URLSearchParams(text);
    }
    const sid = params.get("MessageSid") ?? params.get("SmsSid");
    const status = params.get("MessageStatus") ?? params.get("SmsStatus");
    const errorCode = params.get("ErrorCode");
    const errorMessage = params.get("ErrorMessage");

    if (!sid || !status) {
      return new Response(JSON.stringify({ error: "missing_sid_or_status" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const mapped = mapStatus(status);
    const now = new Date().toISOString();
    const update: Record<string, unknown> = {
      status: mapped,
      webhook_received_at: now,
    };
    if (mapped === "delivered") update.delivered_at = now;
    if (mapped === "failed" || mapped === "undelivered") update.failed_at = now;
    if (errorCode) update.error_code = errorCode;
    if (errorMessage) update.error_message = errorMessage;

    const { error } = await supabase.from("sms_events_v2").update(update).eq("twilio_sid", sid);
    if (error) {
      console.error("twilio-status-v2 update failed", error.message);
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Mirror to contractor_onboarding_messages by twilio_message_sid
    const comUpdate: Record<string, unknown> = { status: mapped };
    if (mapped === "delivered") comUpdate.delivered_at = now;
    if (errorCode) comUpdate.error_message = `${errorCode}: ${errorMessage ?? ""}`.trim();
    await supabase.from("contractor_onboarding_messages").update(comUpdate).eq("twilio_message_sid", sid);
    // Mirror last_sms_status onto the lead
    await supabase.rpc("noop_safe", {}).catch(() => {});
    const { data: comRow } = await supabase
      .from("contractor_onboarding_messages")
      .select("contractor_lead_id")
      .eq("twilio_message_sid", sid)
      .maybeSingle();
    if (comRow?.contractor_lead_id) {
      await supabase.from("contractor_leads").update({ last_sms_status: mapped }).eq("id", comRow.contractor_lead_id);
    }


    // Mirror to sms_test_runs if this SID belongs to a test run
    const testRunUpdate: Record<string, unknown> = {
      callback_received: true,
      callback_received_at: now,
      updated_at: now,
    };
    if (mapped === "delivered") {
      testRunUpdate.delivered_at = now;
      testRunUpdate.success = true;
    }
    if (mapped === "failed" || mapped === "undelivered") {
      testRunUpdate.failed_at = now;
      testRunUpdate.error = errorMessage || `twilio_${mapped}`;
    }
    await supabase.from("sms_test_runs").update(testRunUpdate).eq("message_sid", sid);

    // Auto-enqueue retry on failure
    if (mapped === "failed" || mapped === "undelivered") {
      const { data: ev } = await supabase.from("sms_events_v2").select("id, attempt_number").eq("twilio_sid", sid).maybeSingle();
      if (ev && (ev.attempt_number ?? 1) < 3) {
        const delays = [15 * 60_000, 24 * 60 * 60_000, 72 * 60 * 60_000];
        const next = new Date(Date.now() + delays[(ev.attempt_number ?? 1) - 1]).toISOString();
        await supabase.from("sms_retry_queue").insert({ event_id: ev.id, attempt: (ev.attempt_number ?? 1) + 1, scheduled_at: next });
        await supabase.from("sms_events_v2").update({ status: "retry_scheduled", next_retry_at: next }).eq("id", ev.id);
      } else if (ev) {
        await supabase.from("sms_events_v2").update({ status: "contact_required" }).eq("id", ev.id);
        try {
          await supabase.from("admin_notifications").insert({
            type: "sms_contact_required",
            title: "SMS contact required",
            body: `Message ${sid} failed 3× — manual follow-up needed.`,
            severity: "warning",
            payload_json: { event_id: ev.id, twilio_sid: sid },
          });
        } catch (_) { /* swallow */ }
      }
    }

    return new Response("ok", { status: 200, headers: corsHeaders });
  } catch (e) {
    console.error("twilio-status-v2 error", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
