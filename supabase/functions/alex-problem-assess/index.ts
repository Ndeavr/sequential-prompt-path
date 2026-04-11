/**
 * alex-problem-assess — Analyzes user input to detect problem, symptom,
 * urgency, required trade, and next steps.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, conversation_context } = await req.json();

    if (!text) {
      return new Response(
        JSON.stringify({ error: "text is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

    const contextStr = conversation_context
      ? `\nContexte conversation: ${JSON.stringify(conversation_context)}`
      : "";

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Tu es un moteur d'évaluation de problèmes résidentiels pour UNPRO au Québec.
Analyse le message et retourne un JSON strict:
{
  "symptom_label": "description courte du symptôme",
  "probable_problem": "problème probable identifié",
  "recommended_trade": "plomberie|électricité|toiture|isolation|chauffage|climatisation|rénovation_générale|cuisine|salle_de_bain|fenêtres|fondation|extérieur|peinture|plancher|autre",
  "urgency_level": "low|normal|high|emergency",
  "requires_photo": true/false,
  "requires_address": true/false,
  "requires_login": false,
  "assessment_confidence": 0.0-1.0,
  "next_question_fr": "une seule question courte et utile si besoin de clarification, sinon null",
  "property_type_detected": "maison|condo|duplex|triplex|commercial|null"
}
Réponds UNIQUEMENT avec le JSON, sans markdown.${contextStr}`,
          },
          { role: "user", content: text },
        ],
      }),
    });

    if (!aiRes.ok) throw new Error(`AI error: ${aiRes.status}`);

    const aiData = await aiRes.json();
    const raw = aiData.choices?.[0]?.message?.content || "{}";
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned);

    return new Response(
      JSON.stringify({
        symptom_label: parsed.symptom_label || null,
        probable_problem: parsed.probable_problem || null,
        recommended_trade: parsed.recommended_trade || "autre",
        urgency_level: parsed.urgency_level || "normal",
        requires_photo: parsed.requires_photo || false,
        requires_address: parsed.requires_address || false,
        requires_login: parsed.requires_login || false,
        assessment_confidence: parsed.assessment_confidence || 0.5,
        next_question_fr: parsed.next_question_fr || null,
        property_type_detected: parsed.property_type_detected || null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("alex-problem-assess error:", err);
    return new Response(
      JSON.stringify({ error: "Problem assessment failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
