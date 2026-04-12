import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const INTENT_PATTERNS: Array<{ intent: string; patterns: RegExp[]; sentiment: string }> = [
  {
    intent: "interested",
    patterns: [
      /oui|yes|int[eé]ress[eé]|j'aimerais|je veux|je suis int[eé]ress[eé]|tell me more|dites-moi|montrez/i,
      /score|aipp|analyse|voir|check|r[eé]sultat/i,
    ],
    sentiment: "positive",
  },
  {
    intent: "meeting_requested",
    patterns: [
      /rendez-vous|rdv|meeting|appel|call|disponible|quand|schedule|planifier|r[eé]server/i,
    ],
    sentiment: "positive",
  },
  {
    intent: "not_now",
    patterns: [
      /pas maintenant|plus tard|pas le moment|busy|occup[eé]|not now|later|revenez/i,
    ],
    sentiment: "neutral",
  },
  {
    intent: "already_working_on_it",
    patterns: [
      /d[eé]j[aà]|already|on travaille|en cours|we.re working|j'ai d[eé]j[aà]/i,
    ],
    sentiment: "neutral",
  },
  {
    intent: "objection_price",
    patterns: [
      /trop cher|co[uû]t|prix|budget|expensive|price|combien/i,
    ],
    sentiment: "negative",
  },
  {
    intent: "objection_time",
    patterns: [
      /pas le temps|no time|trop occup[eé]/i,
    ],
    sentiment: "negative",
  },
  {
    intent: "wrong_contact",
    patterns: [
      /mauvaise personne|wrong person|pas moi|not me|wrong email|mauvais contact/i,
    ],
    sentiment: "negative",
  },
  {
    intent: "stop",
    patterns: [
      /arr[eê]ter|stop|unsubscribe|d[eé]sabonner|remove|retirer|ne.*plus|spam|harassment/i,
    ],
    sentiment: "negative",
  },
];

function classifyReply(subject: string, body: string): { intent: string; sentiment: string; confidence: number } {
  const text = `${subject} ${body}`.toLowerCase();

  for (const { intent, patterns, sentiment } of INTENT_PATTERNS) {
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        return { intent, sentiment, confidence: 0.8 };
      }
    }
  }

  return { intent: "unknown", sentiment: "neutral", confidence: 0.3 };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { reply_id } = await req.json();
    if (!reply_id) {
      return new Response(JSON.stringify({ error: "reply_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: reply } = await supabase
      .from("outbound_replies")
      .select("*")
      .eq("id", reply_id)
      .maybeSingle();

    if (!reply) {
      return new Response(JSON.stringify({ error: "Reply not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { intent, sentiment, confidence } = classifyReply(reply.subject || "", reply.body_text || "");

    // Update reply
    await supabase.from("outbound_replies").update({
      reply_intent: intent,
      sentiment,
    }).eq("id", reply_id);

    // Handle automatic actions
    const positiveIntents = ["interested", "meeting_requested"];
    const stopIntents = ["stop"];

    if (positiveIntents.includes(intent) && reply.lead_id) {
      // Stop sequence, mark positive
      await supabase.from("outbound_leads").update({
        crm_status: intent === "meeting_requested" ? "meeting_booked" : "replied_positive",
        updated_at: new Date().toISOString(),
      }).eq("id", reply.lead_id);

      await supabase.from("outbound_events").insert({
        lead_id: reply.lead_id,
        campaign_id: reply.campaign_id,
        event_type: "reply_classified",
        event_value: intent,
      });
    }

    if (stopIntents.includes(intent)) {
      // Add to suppressions
      const { data: lead } = await supabase
        .from("outbound_leads")
        .select("company_id, contact_id")
        .eq("id", reply.lead_id)
        .maybeSingle();

      if (lead?.contact_id) {
        const { data: contact } = await supabase
          .from("outbound_contacts")
          .select("email")
          .eq("id", lead.contact_id)
          .maybeSingle();

        if (contact?.email) {
          await supabase.from("outbound_suppressions").insert({
            email: contact.email,
            reason: "unsubscribe_reply",
            scope: "global",
          });
        }
      }

      await supabase.from("outbound_leads").update({
        crm_status: "unsubscribed",
        updated_at: new Date().toISOString(),
      }).eq("id", reply.lead_id);
    }

    return new Response(JSON.stringify({ success: true, intent, sentiment, confidence }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
