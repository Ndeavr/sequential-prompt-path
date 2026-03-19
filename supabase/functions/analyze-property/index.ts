import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { deriveAnalysisInputs } from "../_shared/property-derived.ts";
import { calculateHomeScore } from "../_shared/property-score.ts";
import { buildRecommendations } from "../_shared/property-recommendations.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Content-Type": "application/json",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ ok: false, error: "Unauthorized" }),
        { status: 401, headers: corsHeaders },
      );
    }

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } =
      await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ ok: false, error: "Unauthorized" }),
        { status: 401, headers: corsHeaders },
      );
    }

    const userId = claimsData.claims.sub as string;

    const { propertyId } = await req.json();
    if (!propertyId) {
      return new Response(
        JSON.stringify({ ok: false, error: "propertyId is required" }),
        { status: 400, headers: corsHeaders },
      );
    }

    // Use auth client for RLS-protected reads
    const { data: property, error: propError } = await supabaseAuth
      .from("properties")
      .select("*")
      .eq("id", propertyId)
      .single();

    if (propError || !property) {
      return new Response(
        JSON.stringify({ ok: false, error: "Property not found" }),
        { status: 404, headers: corsHeaders },
      );
    }

    if (property.user_id !== userId) {
      return new Response(
        JSON.stringify({ ok: false, error: "Forbidden" }),
        { status: 403, headers: corsHeaders },
      );
    }

    const [docsRes, eventsRes] = await Promise.all([
      supabaseAuth
        .from("property_documents")
        .select("document_type, extracted_json")
        .eq("property_id", propertyId),
      supabaseAuth
        .from("property_events")
        .select("event_type, title, event_date, metadata")
        .eq("property_id", propertyId),
    ]);

    if (docsRes.error) {
      return new Response(
        JSON.stringify({ ok: false, error: docsRes.error.message }),
        { status: 500, headers: corsHeaders },
      );
    }
    if (eventsRes.error) {
      return new Response(
        JSON.stringify({ ok: false, error: eventsRes.error.message }),
        { status: 500, headers: corsHeaders },
      );
    }

    const analysisInput = deriveAnalysisInputs({
      property,
      documents: docsRes.data ?? [],
      events: eventsRes.data ?? [],
    });

    const score = calculateHomeScore(analysisInput);
    const recommendations = buildRecommendations(score);

    // Use service role for writes
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Insert new score
    const { error: scoreErr } = await serviceClient
      .from("property_scores")
      .insert({
        property_id: propertyId,
        user_id: userId,
        overall_score: score.overall_score,
        component_scores: score.component_scores,
        score_type: "home_score",
        notes: `Confidence: ${score.confidence_score}% | Version: ${score.scoring_version}`,
        source: score.source,
      });

    if (scoreErr) {
      return new Response(
        JSON.stringify({ ok: false, error: scoreErr.message }),
        { status: 500, headers: corsHeaders },
      );
    }

    // Delete old system recommendations
    await serviceClient
      .from("property_recommendations")
      .delete()
      .eq("property_id", propertyId)
      .eq("source", "system");

    // Insert new recommendations
    if (recommendations.length > 0) {
      const payload = recommendations.map((rec) => ({
        property_id: propertyId,
        ...rec,
      }));

      const { error: recErr } = await serviceClient
        .from("property_recommendations")
        .insert(payload);

      if (recErr) {
        return new Response(
          JSON.stringify({ ok: false, error: recErr.message }),
          { status: 500, headers: corsHeaders },
        );
      }
    }

    // Update estimated_score on the property
    await serviceClient
      .from("properties")
      .update({ estimated_score: score.overall_score })
      .eq("id", propertyId);

    return new Response(
      JSON.stringify({
        ok: true,
        score,
        recommendationsCount: recommendations.length,
        derived: analysisInput.derived,
      }),
      { status: 200, headers: corsHeaders },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: corsHeaders },
    );
  }
});
