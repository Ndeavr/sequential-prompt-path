import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { contractor_id } = await req.json();
    if (!contractor_id) {
      return new Response(JSON.stringify({ error: "contractor_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Gather contractor data
    const [contRes, docsRes, reviewsRes, apptsRes, perfRes] = await Promise.all([
      supabase.from("contractors").select("*").eq("id", contractor_id).single(),
      supabase.from("storage_documents").select("id", { count: "exact", head: true }).eq("entity_id", contractor_id),
      supabase.from("reviews").select("rating").eq("contractor_id", contractor_id),
      supabase.from("appointments").select("id, status").eq("contractor_id", contractor_id),
      supabase.from("contractor_performance_metrics").select("*").eq("contractor_id", contractor_id).maybeSingle(),
    ]);

    const contractor = contRes.data;
    if (!contractor) {
      return new Response(JSON.stringify({ error: "Contractor not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const docCount = docsRes.count || 0;
    const reviews = reviewsRes.data || [];
    const appointments = apptsRes.data || [];
    const perf = perfRes.data;

    // Profile completeness (0-100)
    let profileScore = 0;
    if (contractor.business_name) profileScore += 10;
    if (contractor.description && contractor.description.length > 50) profileScore += 10;
    if (contractor.phone) profileScore += 10;
    if (contractor.email) profileScore += 10;
    if (contractor.website) profileScore += 5;
    if (contractor.address) profileScore += 5;
    if (contractor.city) profileScore += 5;
    if (contractor.license_number) profileScore += 15;
    if (contractor.insurance_info) profileScore += 10;
    if (contractor.logo_url) profileScore += 5;
    if ((contractor.portfolio_urls || []).length > 0) profileScore += 5;
    if (contractor.years_experience && contractor.years_experience > 0) profileScore += 5;
    if (docCount > 0) profileScore += 5;
    profileScore = Math.min(100, profileScore);

    // Trust score (0-100)
    let trustScore = 20;
    if (contractor.verification_status === "verified") trustScore += 30;
    else if (contractor.verification_status === "pending") trustScore += 10;
    if (contractor.license_number) trustScore += 15;
    if (contractor.insurance_info) trustScore += 15;
    if (docCount >= 3) trustScore += 10;
    else if (docCount >= 1) trustScore += 5;
    if (reviews.length >= 5) trustScore += 10;
    else if (reviews.length >= 1) trustScore += 5;
    trustScore = Math.min(100, trustScore);

    // Visibility score (0-100)
    let visibilityScore = 10;
    const avgRating = reviews.length > 0 ? reviews.reduce((s: number, r: any) => s + (r.rating || 0), 0) / reviews.length : 0;
    visibilityScore += Math.min(30, reviews.length * 5);
    if (avgRating >= 4.5) visibilityScore += 25;
    else if (avgRating >= 4.0) visibilityScore += 20;
    else if (avgRating >= 3.5) visibilityScore += 10;
    if (contractor.website) visibilityScore += 10;
    if ((contractor.portfolio_urls || []).length >= 3) visibilityScore += 10;
    visibilityScore = Math.min(100, visibilityScore);

    // AIPP score (weighted)
    const aippScore = Math.round(
      profileScore * 0.25 +
      trustScore * 0.4 +
      visibilityScore * 0.2 +
      (perf?.appointment_show_rate || 0.5) * 15
    );

    // UNPRO score (overall platform score)
    const unproScore = Math.round(
      aippScore * 0.5 +
      profileScore * 0.2 +
      visibilityScore * 0.3
    );

    // Save to contractor_public_scores
    const { data: existingScores } = await supabase
      .from("contractor_public_scores")
      .select("id")
      .eq("contractor_id", contractor_id)
      .maybeSingle();

    const scorePayload = {
      contractor_id,
      aipp_score: aippScore,
      trust_score: trustScore,
      profile_completeness_score: profileScore,
      visibility_score: visibilityScore,
      unpro_score: unproScore,
      updated_at: new Date().toISOString(),
    };

    if (existingScores) {
      await supabase.from("contractor_public_scores").update(scorePayload).eq("contractor_id", contractor_id);
    } else {
      await supabase.from("contractor_public_scores").insert(scorePayload);
    }

    // Update contractor aipp_score
    await supabase.from("contractors").update({ aipp_score: aippScore }).eq("id", contractor_id);

    return new Response(JSON.stringify({
      success: true,
      scores: {
        aipp: aippScore,
        unpro: unproScore,
        profile: profileScore,
        trust: trustScore,
        visibility: visibilityScore,
      },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("Compute contractor score error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
