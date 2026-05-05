// Sends an SMS via Twilio connector. Logs to acq_sms_logs.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
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

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    const twilioKey = Deno.env.get("TWILIO_API_KEY");
    const fromNumber = Deno.env.get("TWILIO_FROM_NUMBER");
    let status = "queued";
    let providerId: string | null = null;
    let error: string | null = null;

    if (apiKey && twilioKey && fromNumber) {
      try {
        const r = await fetch("https://connector-gateway.lovable.dev/twilio/Messages.json", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "X-Connection-Api-Key": twilioKey,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({ To: recipient, From: fromNumber, Body: body }),
        });
        const j = await r.json();
        if (!r.ok) { status = "failed"; error = JSON.stringify(j); }
        else { status = "sent"; providerId = j.sid || null; }
      } catch (e: any) {
        status = "failed"; error = String(e?.message ?? e);
      }
    } else {
      error = "twilio_not_configured";
    }

    await sb.from("acq_sms_logs").insert({
      contractor_id: contractor_id || null,
      recipient_phone: recipient,
      body,
      status,
      provider_message_id: providerId,
      error,
      sent_at: status === "sent" ? new Date().toISOString() : null,
    });

    return new Response(JSON.stringify({ ok: status === "sent", status, error }), {
      headers: { ...cors, "Content-Type": "application/json" }
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
