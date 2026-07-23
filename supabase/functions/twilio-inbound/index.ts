/**
 * UNPRO — twilio-inbound webhook (hardened for CASL/LCAP)
 *
 * Hardening in this revision:
 *   1. X-Twilio-Signature validation (HMAC-SHA1 over URL + sorted body params, base64).
 *      When TWILIO_AUTH_TOKEN is set and the signature is missing or invalid we
 *      return 403 instead of accepting the payload. This closes the risk of a
 *      forged inbound message spoofing a STOP or a false reply.
 *   2. On STOP we now insert the number into `sms_opt_outs` (canonical), and
 *      also into `outreach_suppressions` (unified suppression source). This
 *      guarantees the SAME phone will be blocked by the pre-send commercial
 *      gate regardless of which suppression source the sender consults.
 *   3. Classifier expanded: STOP, ARRET, ARRÊT, UNSUBSCRIBE, CANCEL, END, QUIT.
 *   4. Structured logging preserved. This function does NOT send anything.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-twilio-signature",
};

function classify(body: string): string {
  const b = body.toLowerCase().trim().replace(/[!.?,;:]+$/g, "");
  if (/\b(stop|arret|arrêt|unsubscribe|cancel|end|quit|desabonner|désabonner)\b/.test(b)) return "stop";
  if (/\b(help|aide|info)\b/.test(b)) return "help";
  // Simple positive acknowledgements — must route to onboarding.
  // Match short one-word replies and common French/English affirmations.
  if (/^(oui|yes|y|ok|okay|okey|d'accord|daccord|correct|parfait|allons-y|go|sure|oui svp|oui merci|ouais|ya|yeah|yep|yup|absolument|certainement|volontiers|intéressé|interesse|interessé|intéressée|interessee|ca m'intéresse|ça m'intéresse|ca minteresse|je suis intéressé|je suis interesse|dites-m'en plus|dis m'en plus|plus d'info|plus dinfo|expliquez|explique|allo|hello|salut|bonjour|hi|hey)$/.test(b)) return "positive";
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

function forbidden(reason: string): Response {
  return new Response(`Forbidden: ${reason}`, {
    status: 403,
    headers: { ...corsHeaders, "Content-Type": "text/plain" },
  });
}

/**
 * Validate X-Twilio-Signature per Twilio docs:
 *   signature = base64( HMAC-SHA1( authToken, url + concat(sortedParams) ) )
 * where sortedParams = keys sorted ascending, each rendered as key+value with no separator.
 */
async function validateTwilioSignature(
  url: string,
  params: Record<string, string>,
  signatureHeader: string,
  authToken: string,
): Promise<boolean> {
  const sortedKeys = Object.keys(params).sort();
  const concatenated = sortedKeys.reduce((acc, k) => acc + k + params[k], url);
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(authToken),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(concatenated));
  const bytes = new Uint8Array(sig);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  const expected = btoa(binary);
  // Constant-time compare
  if (expected.length !== signatureHeader.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ signatureHeader.charCodeAt(i);
  }
  return mismatch === 0;
}

function normalizeTail10(raw: string): string {
  return raw.replace(/\D/g, "").slice(-10);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN") || "";
    const REQUIRE_SIGNATURE = (Deno.env.get("TWILIO_REQUIRE_SIGNATURE") ?? "true").toLowerCase() !== "false";

    const sb = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const form = await req.formData();
    const rawPayload: Record<string, string> = {};
    for (const [k, v] of form.entries()) rawPayload[k] = String(v);

    const From = rawPayload.From ?? "";
    const To = rawPayload.To ?? "";
    const Body = rawPayload.Body ?? "";
    const MessageSid = rawPayload.MessageSid ?? "";
    const AccountSid = rawPayload.AccountSid ?? "";

    // --- 1. Signature validation ---
    // The webhook URL used to compute the signature must be the exact URL Twilio requested,
    // reconstructed from Host + original path. Deno gives us the request URL directly.
    const signatureHeader = req.headers.get("x-twilio-signature") ?? "";
    if (REQUIRE_SIGNATURE && TWILIO_AUTH_TOKEN) {
      if (!signatureHeader) {
        console.warn("twilio-inbound: rejected — missing X-Twilio-Signature");
        return forbidden("missing_signature");
      }
      const url = req.url;
      const ok = await validateTwilioSignature(url, rawPayload, signatureHeader, TWILIO_AUTH_TOKEN);
      if (!ok) {
        console.warn("twilio-inbound: rejected — invalid X-Twilio-Signature", { url, MessageSid });
        return forbidden("invalid_signature");
      }
    } else if (REQUIRE_SIGNATURE) {
      console.warn("twilio-inbound: TWILIO_AUTH_TOKEN missing — signature check skipped (dev mode)");
    }

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
      payload: {
        ...rawPayload,
        from: From, to: To, body: Body, intent,
        account_sid: AccountSid ? `${AccountSid.slice(0, 4)}…${AccountSid.slice(-4)}` : null,
        signature_verified: REQUIRE_SIGNATURE && !!TWILIO_AUTH_TOKEN,
      },
    });

    const tail = normalizeTail10(From);
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

    // --- 2. STOP → write to canonical suppression sources ---
    // These writes are idempotent (upsert on normalized_phone unique index / dedup insert).
    if (intent === "stop") {
      // Canonical (used by is_phone_suppressed())
      await sb.from("sms_opt_outs").upsert(
        { normalized_phone: tail, reason: "sms_stop_reply", source: "twilio-inbound" },
        { onConflict: "normalized_phone", ignoreDuplicates: true },
      );

      // Unified suppression (also read by is_phone_suppressed())
      const { data: existingSup } = await sb.from("outreach_suppressions")
        .select("id").eq("contact_type", "phone").eq("contact_value", From).limit(1).maybeSingle();
      if (!existingSup) {
        await sb.from("outreach_suppressions").insert({
          contact_type: "phone",
          contact_value: From,
          suppression_reason: "sms_stop_reply",
          source: "twilio-inbound",
        });
      }
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

    // We deliberately DO NOT auto-reply to STOP with any promotional wording.
    // Twilio itself sends the native opt-out confirmation; we return empty TwiML.
    if (intent === "stop") return twiml();
    if (intent === "help") return twiml("UNPRO: Aide au 1-800-UNPRO. Répondez STOP pour vous désabonner.");

    if (reply?.id) {
      sb.functions.invoke("agent-activation-reply", { body: { reply_id: reply.id } }).catch(() => {});
    }
    return twiml();
  } catch (e) {
    console.error("twilio-inbound", e);
    return twiml();
  }
});
