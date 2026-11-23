/**
 * UNPRO — twilio-inbound webhook (CASL/LCAP).
 *
 * - POST + application/x-www-form-urlencoded only; X-Twilio-Signature validated against the
 *   exact public URL (SUPABASE_URL/functions/v1/twilio-inbound + query). Invalid → 403.
 * - Idempotent by MessageSid (unique index on sms_messages.message_sid): a Twilio retry
 *   re-applies the opt-out (idempotent) and returns empty TwiML without new side effects.
 * - STOP/ARRÊT/UNSUBSCRIBE and explicit refusals → sms_opt_outs + outreach_suppressions.
 * - Legitimate replies go to the human admin queue; auto-responders are stored only.
 * - Never auto-sells: no checkout link, no automatic commercial reply. HELP gets one
 *   informational GSM-7 segment unless Twilio Advanced Opt-Out already answered.
 * - Inbound text is stored verbatim (accents preserved).
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { isValidTwilioSignature } from "../_shared/twilioSignature.ts";
import { classifyInbound, maskPhone, normalizeE164 } from "../_shared/smsInbound.ts";

const XML = { "Content-Type": "text/xml; charset=utf-8" };
const HELP_TEXT = "UNPRO - Aide: unpro.ca/contact. Questions par SMS: 450-328-6776. Pour ne plus recevoir de SMS commerciaux, répondez STOP.";

function twiml(message?: string): Response {
  const xml = message
    ? `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${message.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</Message></Response>`
    : `<?xml version="1.0" encoding="UTF-8"?><Response/>`;
  return new Response(xml, { status: 200, headers: XML });
}
const plain = (status: number, text: string) => new Response(text, { status, headers: { "Content-Type": "text/plain" } });

Deno.serve(async (req) => {
  if (req.method !== "POST") return plain(405, "Method Not Allowed");
  const ctype = (req.headers.get("content-type") ?? "").toLowerCase();
  if (!ctype.startsWith("application/x-www-form-urlencoded")) return plain(415, "Unsupported Media Type");

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN") ?? "";
  if (!SUPABASE_URL || !SERVICE_ROLE || !TWILIO_AUTH_TOKEN) {
    console.error("twilio-inbound: missing configuration");
    return plain(503, "Service Unavailable");
  }

  const raw: Record<string, string> = {};
  for (const [k, v] of new URLSearchParams(await req.text())) raw[k] = v;

  const signature = req.headers.get("x-twilio-signature") ?? "";
  const publicUrl = `${SUPABASE_URL}/functions/v1/twilio-inbound${new URL(req.url).search}`;
  if (!(await isValidTwilioSignature(publicUrl, raw, signature, TWILIO_AUTH_TOKEN))) {
    console.warn("twilio-inbound: rejected signature", { has_header: !!signature });
    return plain(403, "Forbidden");
  }

  const MessageSid = raw.MessageSid ?? raw.SmsSid ?? "";
  if (!/^(SM|MM)[0-9a-f]{32}$/i.test(MessageSid)) return twiml();

  const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { autoRefreshToken: false, persistSession: false } });
  const from = normalizeE164(raw.From ?? "");
  const to = raw.To ?? "";
  const body = raw.Body ?? "";
  const optOutType = (raw.OptOutType ?? "").toUpperCase();
  const intent = classifyInbound(body, optOutType);
  const tail = from.replace(/\D/g, "").slice(-10);
  let persisted = false;

  try {
    const suppress = async () => {
      await sb.from("sms_opt_outs").upsert(
        { normalized_phone: tail, reason: optOutType === "STOP" ? "sms_stop_keyword" : "sms_stop_or_refusal_reply", source: "twilio-inbound" },
        { onConflict: "normalized_phone", ignoreDuplicates: true },
      );
      const { data: sup } = await sb.from("outreach_suppressions").select("id")
        .eq("contact_type", "phone").eq("contact_value", from).limit(1).maybeSingle();
      if (!sup) {
        await sb.from("outreach_suppressions").insert({
          contact_type: "phone", contact_value: from, suppression_reason: "sms_stop_reply", source: "twilio-inbound",
        });
      }
    };

    // Prospect association by normalized E.164 (canonical verified prospects, then legacy leads).
    const { data: vcp } = await sb.from("verified_contractor_prospects").select("id")
      .or(`phone_e164.eq.${from},phone_primary.ilike.%${tail}`).limit(1).maybeSingle();
    const { data: lead } = await sb.from("contractor_leads").select("id")
      .or(`phone.ilike.%${tail},mobile_phone.ilike.%${tail}`).limit(1).maybeSingle();
    const prospectId = vcp?.id ?? null;
    const leadId = lead?.id ?? null;

    // Idempotency gate: first writer wins on MessageSid.
    const { data: smsRow, error: insErr } = await sb.from("sms_messages").insert({
      message_sid: MessageSid, phone_number: from, direction: "inbound", message_body: body,
      status: "received", intent, provider: "twilio", prospect_id: prospectId,
    }).select("id").maybeSingle();
    if (insErr) {
      if (insErr.code === "23505") {
        if (intent === "stop") await suppress();
        return twiml();
      }
      throw insErr;
    }
    persisted = true;

    if (intent === "stop") await suppress();

    const { data: reply } = await sb.from("outreach_replies").insert({
      lead_id: leadId, channel: "sms", provider: "twilio", provider_message_id: MessageSid,
      from_address: from, body, intent, processed: intent === "auto_reply" || intent === "stop",
      metadata: { verified_prospect_id: prospectId, to, opt_out_type: optOutType || null, needs_human: !["auto_reply", "stop"].includes(intent) },
    }).select("id").maybeSingle();

    await sb.from("message_events").insert({
      channel: "sms", provider: "twilio", provider_message_id: MessageSid, message_event_type: "inbound",
      status: "received", source_table: "sms_messages", source_row_id: smsRow?.id ?? null,
      payload: { intent, to, verified_prospect_id: prospectId, lead_id: leadId, signature_verified: true },
    });

    if (reply?.id) {
      await sb.from("acquisition_events").insert({
        channel: "sms", event_type: intent === "stop" ? "unsubscribed" : "contacted", provider: "twilio",
        provider_event_id: MessageSid, source_table: "outreach_replies", source_row_id: reply.id,
        metadata: { lead_id: leadId, verified_prospect_id: prospectId, intent, inbound_reply: true },
        occurred_at: new Date().toISOString(),
      });
    }

    if (intent !== "auto_reply") {
      await sb.from("admin_notifications").insert({
        type: intent === "stop" ? "sms_opt_out" : "sms_inbound_reply",
        severity: intent === "stop" ? "info" : "warning",
        title: intent === "stop" ? "Désabonnement SMS enregistré" : "Réponse SMS à traiter par un humain",
        body: `${maskPhone(from)} — ${intent} — ${body.slice(0, 280)}`,
        payload_json: { reply_id: reply?.id ?? null, sms_message_id: smsRow?.id ?? null, intent, verified_prospect_id: prospectId, lead_id: leadId },
      });
    }

    if (leadId) {
      const now = new Date().toISOString();
      if (intent === "stop") {
        await sb.from("contractor_leads").update({ pipeline_status: "unsubscribed", unsubscribed_at: now }).eq("id", leadId);
        await sb.from("onboarding_sequences").update({ status: "completed_unsubscribed", stopped_reason: "sms_stop" })
          .eq("contractor_lead_id", leadId).in("status", ["active", "waiting", "paused"]);
        await sb.from("contractor_onboarding_messages").update({ status: "skipped", skip_reason: "unsubscribed" })
          .eq("contractor_lead_id", leadId).eq("status", "queued");
        await sb.from("curiosity_sequences").update({ status: "completed_unsubscribed", stopped_reason: "sms_stop" })
          .eq("contractor_lead_id", leadId).in("status", ["active", "waiting", "paused"]);
        await sb.from("curiosity_funnel_events").insert({ contractor_lead_id: leadId, event_type: "unsubscribed", metadata: { via: "sms_stop" } });
      } else if (intent !== "auto_reply") {
        await sb.from("contractor_leads").update({ pipeline_status: "replied" }).eq("id", leadId);
        await sb.from("onboarding_sequences").update({ status: "paused", stopped_reason: "reply_received" })
          .eq("contractor_lead_id", leadId).eq("status", "active");
        await sb.from("curiosity_sequences").update({ status: "completed_replied", stopped_reason: "reply_received" })
          .eq("contractor_lead_id", leadId).in("status", ["active", "waiting"]);
      }
    }

    // Twilio already confirmed STOP/HELP/START when OptOutType is set; never send promotional text.
    if (intent === "help" && !optOutType) return twiml(HELP_TEXT);
    return twiml();
  } catch (e) {
    console.error("twilio-inbound: processing error", { sid: MessageSid, intent, err: String((e as Error)?.message ?? e) });
    // Opt-outs must never be lost: ask Twilio to retry (then fallback) instead of acknowledging.
    // Unpersisted messages and opt-outs must never be lost: let Twilio retry/fallback.
    if (!persisted || intent === "stop") return plain(500, "retry");
    return twiml();
  }
});
