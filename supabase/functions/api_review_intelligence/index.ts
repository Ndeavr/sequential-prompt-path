// UNPRO AI Trust Layer — Review Intelligence (Good / Bad / Ugly)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { contractor_id, reviews_text } = await req.json();
    if (!contractor_id) return new Response(JSON.stringify({ error: "contractor_id required" }), { status: 400, headers: corsHeaders });
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    const corpus = String(reviews_text || "").slice(0, 8000) || "(aucun avis disponible — déduire à partir d'un profil d'entrepreneur résidentiel québécois moyen)";

    const prompt = `Analyse les avis homeowner pour extraire ce que l'IA apprend. Retourne JSON:
{
  "good": ["3-5 forces concrètes"],
  "bad": ["3-5 faiblesses structurelles de positionnement"],
  "ugly": ["2-3 problèmes d'interprétation AI"],
  "ai_strong_associations": ["entités fortes"],
  "ai_weak_associations": ["entités faibles ou absentes"],
  "homeowner_trust_score": 0-100,
  "review_entities": [{"name":"...","sentiment":"positive|neutral|negative","frequency":1-10}]
}

Avis:
"""${corpus}"""`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "google/gemini-2.5-flash", messages: [{ role: "user", content: prompt }], response_format: { type: "json_object" } }),
    });
    const aiData = await aiRes.json();
    let parsed: any = {};
    try { parsed = JSON.parse(aiData?.choices?.[0]?.message?.content || "{}"); } catch {}

    if (Array.isArray(parsed.review_entities)) {
      const rows = parsed.review_entities.slice(0, 30).map((e: any) => ({
        contractor_id,
        entity_name: String(e.name || "").slice(0, 200),
        sentiment: ["positive", "neutral", "negative"].includes(e.sentiment) ? e.sentiment : "neutral",
        frequency: Number(e.frequency) || 1,
        confidence: 80,
      })).filter((r: any) => r.entity_name);
      if (rows.length) await supabase.from("contractor_review_entities").insert(rows);
    }

    // Update homeowner_trust_score in signals (upsert)
    const { data: existing } = await supabase.from("ai_recommendation_signals").select("id").eq("contractor_id", contractor_id).limit(1).maybeSingle();
    if (existing) {
      await supabase.from("ai_recommendation_signals").update({ homeowner_trust_score: parsed.homeowner_trust_score ?? 0, computed_at: new Date().toISOString() }).eq("id", existing.id);
    } else {
      await supabase.from("ai_recommendation_signals").insert({ contractor_id, homeowner_trust_score: parsed.homeowner_trust_score ?? 0 });
    }

    return new Response(JSON.stringify({ ok: true, review_intel: parsed }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
