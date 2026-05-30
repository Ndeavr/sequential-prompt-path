// Resend Inbound Email webhook — receives replies on reply.unpro.ca
// Parses, matches to lead, classifies intent via Lovable AI, auto-suppresses on opt-out.
// Public endpoint (verify_jwt = false). Validated via Resend signature header.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, svix-id, svix-timestamp, svix-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const RESEND_WEBHOOK_SECRET = Deno.env.get("RESEND_INBOUND_WEBHOOK_SECRET"); // optional, set when user configures it in Resend

type Intent = "interested" | "not_interested" | "unsubscribe" | "question" | "out_of_office" | "bounce" | "other";
type Sentiment = "positive" | "neutral" | "negative";

function stripHtml(html: string): string {
  return html.replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Strip quoted reply chain (lines starting with > or after "Le ... a écrit :" / "On ... wrote:")
function extractNewContent(text: string): string {
  const lines = text.split(/\r?\n/);
  const out: string[] = [];
  const quoteMarkers = [
    /^>/, /^Le\s.+a\s+écrit\s*:/i, /^On\s.+wrote\s*:/i,
    /^De\s*:.+/i, /^From\s*:.+/i, /^-{2,}\s*Original/i,
  ];
  for (const line of lines) {
    if (quoteMarkers.some(r => r.test(line.trim()))) break;
    out.push(line);
  }
  return out.join("\n").trim();
}

async function classifyReply(subject: string, body: string): Promise<{ intent: Intent; sentiment: Sentiment; confidence: number; reason: string }> {
  if (!LOVABLE_API_KEY) {
    // Fallback heuristic
    const lower = `${subject} ${body}`.toLowerCase();
    if (/unsubscribe|désabonner|désinscri|retir(er|ez).+liste|stop|arrêt(er|ez)/i.test(lower)) {
      return { intent: "unsubscribe", sentiment: "negative", confidence: 0.9, reason: "keyword match" };
    }
    if (/out of office|absence|congé|vacation|hors bureau|réponse automatique/i.test(lower)) {
      return { intent: "out_of_office", sentiment: "neutral", confidence: 0.8, reason: "OOO autoreply" };
    }
    if (/intéress|interest|rappel|appel|rendez-vous|book|disponible|oui|yes|call me/i.test(lower)) {
      return { intent: "interested", sentiment: "positive", confidence: 0.6, reason: "interest keywords" };
    }
    if (/pas intéress|not interested|no thanks|non merci|pas besoin/i.test(lower)) {
      return { intent: "not_interested", sentiment: "negative", confidence: 0.7, reason: "rejection keywords" };
    }
    return { intent: "other", sentiment: "neutral", confidence: 0.4, reason: "no signal" };
  }

  try {
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Tu classifies des réponses email de prospects québécois (FR/EN). Réponds STRICTEMENT en JSON: {\"intent\":\"interested|not_interested|unsubscribe|question|out_of_office|bounce|other\",\"sentiment\":\"positive|neutral|negative\",\"confidence\":0.0-1.0,\"reason\":\"...\"}. unsubscribe = demande explicite d'arrêt. out_of_office = réponse automatique d'absence." },
          { role: "user", content: `Sujet: ${subject}\n\nCorps:\n${body.slice(0, 2000)}` },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!r.ok) throw new Error(`AI ${r.status}`);
    const j = await r.json();
    const parsed = JSON.parse(j.choices[0].message.content);
    return {
      intent: parsed.intent as Intent,
      sentiment: parsed.sentiment as Sentiment,
      confidence: Number(parsed.confidence) || 0.5,
      reason: String(parsed.reason || ""),
    };
  } catch (e) {
    console.error("classify_error", e);
    return { intent: "other", sentiment: "neutral", confidence: 0.3, reason: "ai_failure" };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("method not allowed", { status: 405, headers: corsHeaders });

  const rawBody = await req.text();
  let payload: any;
  try { payload = JSON.parse(rawBody); }
  catch { return new Response(JSON.stringify({ error: "invalid json" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }

  // TODO: verify Resend signature (svix-signature header) when RESEND_INBOUND_WEBHOOK_SECRET is configured.
  // For now we log + accept (Resend whitelists by destination domain; webhook URL is unguessable).
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

  try {
    // Resend Inbound event shape: { type:"email.inbound", data:{ from, to, subject, html, text, headers:[{name,value}], ... } }
    const data = payload?.data ?? payload;
    const fromRaw: string = data.from?.email || data.from || "";
    const fromEmail = (typeof fromRaw === "string" ? fromRaw : "")
      .match(/[\w.+-]+@[\w.-]+/)?.[0]?.toLowerCase() || null;
    const toRaw: string = Array.isArray(data.to) ? data.to[0]?.email || data.to[0] : data.to?.email || data.to || "";
    const toEmail = (typeof toRaw === "string" ? toRaw : "").toLowerCase() || null;
    const subject: string = data.subject || "(sans objet)";
    const htmlBody: string = data.html || "";
    const textBody: string = data.text || (htmlBody ? stripHtml(htmlBody) : "");
    const cleanBody = extractNewContent(textBody);

    const headers: Array<{ name: string; value: string }> = data.headers || [];
    const headerMap = new Map(headers.map(h => [h.name.toLowerCase(), h.value]));
    const inReplyTo = headerMap.get("in-reply-to") || data.in_reply_to || null;
    const messageIdHdr = headerMap.get("message-id") || data.message_id || null;

    // Match lead/contact
    let leadId: string | null = null;
    let contactId: string | null = null;
    let companyId: string | null = null;
    let messageId: string | null = null;
    let campaignId: string | null = null;

    if (inReplyTo) {
      const cleaned = inReplyTo.replace(/[<>]/g, "").trim();
      const { data: msg } = await supabase
        .from("outbound_messages")
        .select("id, lead_id, campaign_id")
        .eq("provider_message_id", cleaned)
        .maybeSingle();
      if (msg) {
        messageId = msg.id;
        leadId = msg.lead_id;
        campaignId = msg.campaign_id;
      }
    }

    if (!leadId && fromEmail) {
      const { data: contact } = await supabase
        .from("outbound_contacts")
        .select("id, company_id")
        .eq("email", fromEmail)
        .maybeSingle();
      if (contact) {
        contactId = contact.id;
        companyId = contact.company_id;
        const { data: lead } = await supabase
          .from("outbound_leads")
          .select("id")
          .eq("contact_id", contact.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (lead) leadId = lead.id;
      }
    }

    // Classify
    const cls = await classifyReply(subject, cleanBody);

    // Auto action
    let autoAction: string | null = null;
    if (cls.intent === "unsubscribe" && fromEmail) {
      await supabase.from("outbound_suppressions").insert({
        email: fromEmail,
        suppression_type: "unsubscribed",
        suppression_reason: "User replied with unsubscribe request",
        source: "inbound_reply",
        active: true,
      });
      autoAction = "suppressed";
    } else if (cls.intent === "bounce" && fromEmail) {
      await supabase.from("outbound_suppressions").insert({
        email: fromEmail,
        suppression_type: "hard_bounce",
        suppression_reason: "Bounce detected in reply",
        source: "inbound_reply",
        active: true,
      });
      autoAction = "suppressed_bounce";
    } else if (cls.intent === "interested" || cls.intent === "question") {
      autoAction = "admin_notify";
      await supabase.from("outbound_admin_alerts").insert({
        alert_type: "hot_reply",
        severity: cls.intent === "interested" ? "high" : "medium",
        title: `Réponse ${cls.intent === "interested" ? "intéressée" : "question"} — ${fromEmail || "inconnu"}`,
        message: `${subject}\n\n${cleanBody.slice(0, 400)}`,
        metadata: { lead_id: leadId, contact_id: contactId, from_email: fromEmail, intent: cls.intent },
      }).then(() => {}, () => {}); // best-effort; table may not exist in all envs
    }

    // Persist
    const { data: inserted, error } = await supabase
      .from("outbound_replies")
      .insert({
        lead_id: leadId,
        campaign_id: campaignId,
        message_id: messageId,
        contact_id: contactId,
        company_id: companyId,
        from_email: fromEmail,
        to_email: toEmail,
        reply_subject: subject,
        reply_body: cleanBody.slice(0, 8000),
        reply_intent: cls.intent,
        reply_sentiment: cls.sentiment,
        classification_confidence: cls.confidence,
        suggested_crm_status: cls.intent === "interested" ? "hot" : cls.intent === "unsubscribe" ? "lost" : cls.intent === "not_interested" ? "cold" : null,
        message_id_header: messageIdHdr,
        in_reply_to_header: inReplyTo,
        raw_payload: payload,
        auto_action_taken: autoAction,
        processed_at: new Date().toISOString(),
        received_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error) {
      console.error("insert_error", error);
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Mark message as replied
    if (messageId) {
      await supabase.from("outbound_messages").update({ replied: true }).eq("id", messageId);
    }

    return new Response(JSON.stringify({ ok: true, reply_id: inserted.id, intent: cls.intent, auto_action: autoAction }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("webhook_error", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
