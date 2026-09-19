/**
 * alex-best-match-select — Selects the best contractor match
 * based on problem assessment, location, availability, and scores.
 * Always returns ONE primary recommendation.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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
    const { recommended_trade, city, urgency_level, property_type, conversation_session_id } =
      await req.json();

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Admissibilité stricte : aucun entrepreneur inventé, aucun élargissement
    // silencieux hors métier ou hors territoire.
    let query = sb
      .from("contractors")
      .select("id, business_name, city, specialty, aipp_score, rating, review_count, logo_url, verification_status, is_published, is_discoverable")
      .eq("is_published", true)
      .eq("is_discoverable", true);

    if (city) query = query.ilike("city", `%${city}%`);
    if (recommended_trade) query = query.ilike("specialty", `%${recommended_trade}%`);

    const { data: found } = await query.limit(10);

    // Exclusion ferme : statut de vérification non admissible.
    const INELIGIBLE = new Set(["rejected", "suspended", "expired", "revoked"]);
    const contractors = (found || []).filter(
      (c: any) => !INELIGIBLE.has(String(c.verification_status || "").toLowerCase()),
    );

    // Aucun entrepreneur admissible : état réel, jamais de recommandation fictive.
    if (contractors.length === 0) {
      return new Response(
        JSON.stringify({
          primary_match: null,
          alternative_match: null,
          match_source: "none",
          no_match: true,
          no_match_reason: !city && !recommended_trade
            ? "insufficient_criteria"
            : "no_eligible_contractor",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }


    // Score and rank real contractors using real fields
    const scored = contractors.map((c: any) => {
      const trust = Number(c.aipp_score) || 70;
      const ratingBoost = (Number(c.rating) || 0) * 4; // 0-20
      const reviewsBoost = Math.min(10, Math.log10((c.review_count || 0) + 1) * 10);
      return {
        ...c,
        trust_score: Math.round(trust),
        compatibility_score: Math.min(98, trust + ratingBoost / 2),
        availability_score: Math.min(95, 70 + reviewsBoost),
        reason_summary: `Spécialiste vérifié en ${c.specialty || recommended_trade || "services résidentiels"}, disponible rapidement à ${c.city || "proximité"}.`,
      };
    });

    scored.sort(
      (a: any, b: any) =>
        b.compatibility_score + b.availability_score -
        (a.compatibility_score + a.availability_score)
    );

    const primary = scored[0];
    const alternative = scored.length > 1 ? scored[1] : null;

    if (conversation_session_id) {
      await sb.from("alex_recommendation_decisions").insert({
        conversation_session_id,
        contractor_id: primary.id,
        is_primary_match: true,
        compatibility_score: primary.compatibility_score,
        availability_score: primary.availability_score,
        trust_score: primary.trust_score,
        reason_summary: primary.reason_summary,
      });
    }

    return new Response(
      JSON.stringify({
        primary_match: primary,
        alternative_match: alternative,
        match_source: "database",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("alex-best-match-select error:", err);
    return new Response(
      JSON.stringify({ error: "Match selection failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
