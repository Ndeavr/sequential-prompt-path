// UNPRO AI Trust Layer — AI Trust Position aggregator
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function positionFromScore(score: number): string {
  if (score >= 90) return "category_authority";
  if (score >= 75) return "dominant";
  if (score >= 60) return "trusted";
  if (score >= 40) return "emerging";
  if (score >= 20) return "weak";
  return "invisible";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { contractor_id } = await req.json();
    if (!contractor_id) return new Response(JSON.stringify({ error: "contractor_id required" }), { status: 400, headers: corsHeaders });
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: sig } = await supabase.from("ai_recommendation_signals").select("*").eq("contractor_id", contractor_id).order("computed_at", { ascending: false }).limit(1).maybeSingle();
    const { data: interp } = await supabase.from("contractor_ai_interpretation").select("confidence_score, semantic_gap_score").eq("contractor_id", contractor_id).order("created_at", { ascending: false }).limit(1).maybeSingle();

    const homeowner = Number(sig?.homeowner_trust_score) || 0;
    const confidence = Number(interp?.confidence_score) || 0;
    const gap = Number(interp?.semantic_gap_score) || 0;
    const clarity = Math.max(0, 100 - gap);
    const specialization = clarity;
    const citation = Math.round(confidence * 0.6);
    const local = Math.round((homeowner + clarity) / 2);

    // Weighted aggregate
    const overall = Math.round(
      (citation * 0.20) +
      (clarity * 0.25) +
      (homeowner * 0.20) +
      (specialization * 0.20) +
      (local * 0.15)
    );

    const position = positionFromScore(overall);

    // Upsert signals
    const payload = {
      contractor_id,
      citation_score: citation,
      semantic_clarity_score: clarity,
      homeowner_trust_score: homeowner,
      specialization_score: specialization,
      local_authority_score: local,
      computed_at: new Date().toISOString(),
    };
    if (sig) {
      await supabase.from("ai_recommendation_signals").update(payload).eq("id", sig.id);
    } else {
      await supabase.from("ai_recommendation_signals").insert(payload);
    }

    await supabase.from("contractors_trust").update({ ai_trust_position: position }).eq("id", contractor_id);

    return new Response(JSON.stringify({ ok: true, overall, position, signals: payload }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
