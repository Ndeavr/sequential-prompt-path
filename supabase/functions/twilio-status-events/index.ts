// UNPRO — Twilio status webhook → canonical acquisition_events
// Configure in Twilio: SMS status callback URL = this function URL.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { logAcquisitionEvent } from "../_shared/acquisitionEvents.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-twilio-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const STATUS_MAP: Record<string, "sent" | "delivered" | "failed"> = {
  queued: "sent",
  accepted: "sent",
  sending: "sent",
  sent: "sent",
  delivered: "delivered",
  undelivered: "failed",
  failed: "failed",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return new Response("method not allowed", { status: 405, headers: cors });

  try {
    const form = await req.formData();
    const sid = String(form.get("MessageSid") || "");
    const rawStatus = String(form.get("MessageStatus") || "").toLowerCase();
    const errCode = form.get("ErrorCode");
    const errMsg = form.get("ErrorMessage");
    if (!sid || !rawStatus) return new Response("ok", { headers: cors });

    const eventType = STATUS_MAP[rawStatus] ?? "sent";

    // Resolve contractor_id via existing outreach log
    let contractor_id: string | null = null;
    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    const { data: log } = await supa
      .from("contractor_outreach_logs")
      .select("contractor_id")
      .eq("provider_response->>MessageSid", sid)
      .maybeSingle();
    if (log?.contractor_id) contractor_id = log.contractor_id;

    await logAcquisitionEvent({
      contractor_id,
      channel: "sms",
      event_type: eventType,
      provider: "twilio",
      provider_event_id: `${sid}:${rawStatus}`,
      metadata: {
        twilio_sid: sid,
        twilio_status: rawStatus,
        error_code: errCode ? String(errCode) : null,
        error_message: errMsg ? String(errMsg) : null,
      },
    });

    return new Response("ok", { headers: cors });
  } catch (err) {
    console.error("[twilio-status-events]", err);
    return new Response("ok", { headers: cors }); // always 200 so Twilio doesn't retry-storm
  }
});
