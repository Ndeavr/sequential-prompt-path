// Sends an SMS via the unified twilioSend pipeline (logs to sms_events_v2 + acq_sms_logs).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { sendSms } from "../_shared/twilioSend.ts";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const { contractor_id, body, phone } = await req.json();
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    let recipient = phone;
    if (!recipient && contractor_id) {
      const { data: c } = await sb.from("acq_contractors").select("phone").eq("id", contractor_id).single();
      recipient = c?.phone;
    }
    if (!recipient) throw new Error("no_phone");

    const result = await sendSms({
      to: recipient,
      body,
      message_type: "outreach",
      template_key: "acq_sms_send",
      contractor_id: contractor_id || undefined,
      metadata: { source: "acq-sms-send" },
    });

    const ok = result.status === "sending" || result.status === "sent" || result.status === "delivered";
    await sb.from("acq_sms_logs").insert({
      contractor_id: contractor_id || null,
      recipient_phone: recipient,
      body,
      status: ok ? "sent" : result.status,
      provider_message_id: result.twilio_sid,
      error: result.error_message ?? null,
      sent_at: ok ? new Date().toISOString() : null,
    });

    return new Response(JSON.stringify({ ok, status: result.status, event_id: result.event_id, error: result.error_message }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
