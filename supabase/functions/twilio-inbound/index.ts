/**
 * UNPRO — twilio-inbound webhook
 * Stores inbound SMS, classifies intent, replies via TwiML when appropriate.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

function classify(body: string): string {
  const b = body.toLowerCase().trim();
  if (/\b(stop|arret|arrêt|unsubscribe)\b/.test(b)) return "stop";
  if (/\b(help|aide|info)\b/.test(b)) return "help";
  if (/\b(entrepreneur|pro|contracteur)\b/.test(b)) return "contractor_intent";
  if (/\b(propri[ée]taire|proprio|maison|condo)\b/.test(b)) return "homeowner_intent";
  if (/\b(rdv|rendez-vous|booking|appointment)\b/.test(b)) return "appointment_request";
  return "general";
}

function twiml(message?: string): Response {
  const xml = message
    ? `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${message}</Message></Response>`
    : `<?xml version="1.0" encoding="UTF-8"?><Response/>`;
  return new Response(xml, {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "text/xml" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const form = await req.formData();
    const From = String(form.get("From") || "");
    const Body = String(form.get("Body") || "");
    const MessageSid = String(form.get("MessageSid") || "");

    const intent = classify(Body);

    await sb.from("sms_messages").insert({
      message_sid: MessageSid,
      phone_number: From,
      direction: "inbound",
      message_body: Body,
      status: "received",
      intent,
      provider: "twilio",
    });

    if (intent === "stop") return twiml(); // STOP: silence (carrier handles)
    if (intent === "help") return twiml("UNPRO: Aide au 1-800-UNPRO. Répondez STOP pour vous désabonner.");
    return twiml();
  } catch (e) {
    console.error("twilio-inbound", e);
    return twiml();
  }
});
