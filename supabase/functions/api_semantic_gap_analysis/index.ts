// UNPRO AI Trust Layer — Semantic Gap Analysis
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
    const { contractor_id } = await req.json();
    if (!contractor_id) return new Response(JSON.stringify({ error: "contractor_id required" }), { status: 400, headers: corsHeaders });
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: contractor } = await supabase.from("contractors_trust").select("desired_specialty, primary_specialty, company_name").eq("id", contractor_id).maybeSingle();
    const { data: interp } = await supabase.from("contractor_ai_interpretation").select("detected_identity, confidence_score").eq("contractor_id", contractor_id).order("created_at", { ascending: false }).limit(1).maybeSingle();
    const { data: entities } = await supabase.from("contractor_semantic_entities").select("entity_name, confidence_score").eq("contractor_id", contractor_id).limit(20);

    const desired = contractor?.desired_specialty || contractor?.primary_specialty || "Spécialiste";
    const detected = interp?.detected_identity || "Inconnu";

    const prompt = `Compare l'identité AI détectée vs désirée pour ${contractor?.company_name}.
Détecté: ${detected} (confiance ${interp?.confidence_score ?? 0})
Désiré: ${desired}
Entités: ${JSON.stringify(entities || [])}

Retourne JSON:
{ "semantic_gap_score": 0-100, "severity": "low|medium|high|severe", "narrative": "1 phrase impactante en français", "biggest_gap_type": "specialization|trust|territory|authority" }`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "google/gemini-2.5-flash", messages: [{ role: "user", content: prompt }], response_format: { type: "json_object" } }),
    });
    const aiData = await aiRes.json();
    let parsed: any = {};
    try { parsed = JSON.parse(aiData?.choices?.[0]?.message?.content || "{}"); } catch {}

    await supabase.from("contractor_ai_interpretation").update({
      desired_identity: desired,
      semantic_gap_score: parsed.semantic_gap_score ?? 0,
    }).eq("contractor_id", contractor_id);

    await supabase.from("contractor_recommendation_gaps").insert({
      contractor_id,
      gap_type: parsed.biggest_gap_type || "specialization",
      severity: parsed.severity || "medium",
      ai_confidence_impact: parsed.semantic_gap_score ?? 0,
      narrative: parsed.narrative || "",
    });

    return new Response(JSON.stringify({ ok: true, gap: parsed }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
