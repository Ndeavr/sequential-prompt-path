/**
 * UNPRO — twilio-inbound webhook
 * Stores inbound SMS, classifies intent, replies via TwiML when appropriate.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-twilio-signature",
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
    const To = String(form.get("To") || "");
    const Body = String(form.get("Body") || "");
    const MessageSid = String(form.get("MessageSid") || "");
    const AccountSid = String(form.get("AccountSid") || "");
    const rawPayload = Object.fromEntries(form.entries());

    const intent = classify(Body);

    const { data: smsRow } = await sb.from("sms_messages").insert({
      message_sid: MessageSid,
      phone_number: From,
      direction: "inbound",
      message_body: Body,
      status: "received",
      intent,
      provider: "twilio",
    }).select("id").maybeSingle();

    await sb.from("message_events").insert({
      channel: "sms",
      provider: "twilio",
      provider_message_id: MessageSid,
      message_event_type: "inbound",
      status: "received",
      source_table: "sms_messages",
      source_row_id: smsRow?.id ?? null,
      payload: { ...rawPayload, from: From, to: To, body: Body, intent, account_sid: AccountSid ? `${AccountSid.slice(0, 4)}…${AccountSid.slice(-4)}` : null },
    });

    // Resolve lead by phone (last 10 digits)
    const tail = From.replace(/\D/g, "").slice(-10);
    let leadId: string | null = null;
    if (tail) {
      const { data: lead } = await sb.from("contractor_leads")
        .select("id").or(`phone.ilike.%${tail},mobile_phone.ilike.%${tail}`)
        .limit(1).maybeSingle();
      leadId = lead?.id ?? null;
    }

    const { data: reply } = await sb.from("outreach_replies").insert({
      lead_id: leadId, channel: "sms", provider: "twilio", provider_message_id: MessageSid,
      from_address: From, body: Body, intent,
    }).select("id").single();

    if (reply?.id) {
      await sb.from("acquisition_events").insert({
        channel: "sms",
        event_type: intent === "stop" ? "unsubscribed" : "contacted",
        provider: "twilio",
        provider_event_id: MessageSid,
        source_table: "outreach_replies",
        source_row_id: reply.id,
        metadata: { lead_id: leadId, from: From, to: To, intent, inbound_reply: true, body_preview: Body.slice(0, 160) },
        occurred_at: new Date().toISOString(),
      });
    }

    if (leadId) {
      const newStatus = intent === "stop" ? "unsubscribed" : "replied";
      const patch: Record<string, unknown> = { pipeline_status: newStatus };
      if (intent === "stop") patch.unsubscribed_at = new Date().toISOString();
      await sb.from("contractor_leads").update(patch).eq("id", leadId);

      if (intent === "stop") {
        await sb.from("onboarding_sequences").update({
          status: "completed_unsubscribed",
          stopped_reason: "sms_stop",
        }).eq("contractor_lead_id", leadId).in("status", ["active", "waiting", "paused"]);
        await sb.from("contractor_onboarding_messages").update({
          status: "skipped",
          skip_reason: "unsubscribed",
        }).eq("contractor_lead_id", leadId).eq("status", "queued");
        await sb.from("curiosity_sequences").update({
          status: "completed_unsubscribed",
          stopped_reason: "sms_stop",
        }).eq("contractor_lead_id", leadId).in("status", ["active", "waiting", "paused"]);
        await sb.from("curiosity_funnel_events").insert({
          contractor_lead_id: leadId, event_type: "unsubscribed", metadata: { via: "sms_stop" },
        });
      } else {
        await sb.from("onboarding_sequences").update({
          status: "paused",
          stopped_reason: "reply_received",
        }).eq("contractor_lead_id", leadId).eq("status", "active");
        await sb.from("curiosity_sequences").update({
          status: "completed_replied",
          stopped_reason: "reply_received",
        }).eq("contractor_lead_id", leadId).in("status", ["active", "waiting"]);
      }
    }

    if (intent === "stop") return twiml();
    if (intent === "help") return twiml("UNPRO: Aide au 1-800-UNPRO. Répondez STOP pour vous désabonner.");


    // Fire-and-forget activation agent
    if (reply?.id) {
      sb.functions.invoke("agent-activation-reply", { body: { reply_id: reply.id } }).catch(() => {});
    }
    return twiml();
  } catch (e) {
    console.error("twilio-inbound", e);
    return twiml();
  }
});
