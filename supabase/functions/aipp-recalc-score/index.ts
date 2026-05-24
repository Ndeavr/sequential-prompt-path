// AIPP — Recalculate the 10-dimension score for a profile.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Dim =
  | "identity" | "verification" | "services" | "geography" | "media"
  | "reviews" | "freshness" | "structured_data" | "trust_signals" | "completeness";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { profile_id } = await req.json();
    if (!profile_id) throw new Error("profile_id required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const [{ data: profile }, { data: services }, { data: locations }, { data: media },
      { data: reviews }, { data: validations }, { data: facts }, { data: sources }] =
      await Promise.all([
        supabase.from("aipp_profiles").select("*").eq("id", profile_id).single(),
        supabase.from("aipp_profile_services").select("id").eq("profile_id", profile_id),
        supabase.from("aipp_profile_locations").select("id").eq("profile_id", profile_id),
        supabase.from("aipp_profile_media").select("id").eq("profile_id", profile_id),
        supabase.from("aipp_profile_reviews").select("rating").eq("profile_id", profile_id),
        supabase.from("aipp_profile_validations").select("*").eq("profile_id", profile_id).maybeSingle(),
        supabase.from("aipp_entity_facts").select("*").eq("profile_id", profile_id).maybeSingle(),
        supabase.from("aipp_profile_sources").select("id").eq("profile_id", profile_id),
      ]);

    if (!profile) throw new Error("profile not found");

    const scores: Record<Dim, number> = {
      identity: profile.display_name && profile.primary_trade ? 10 : 5,
      verification: 0,
      services: Math.min(10, (services?.length ?? 0) * 2),
      geography: Math.min(10, (locations?.length ?? 0) * 2.5),
      media: Math.min(10, (media?.length ?? 0) * 1.5),
      reviews: Math.min(10, (reviews?.length ?? 0) * 1),
      freshness: 8,
      structured_data: facts ? 8 : 4,
      trust_signals: (sources?.length ?? 0) > 0 ? 7 : 3,
      completeness: 0,
    };

    let vScore = 0;
    if (validations?.rbq_status === "confirmed") vScore += 4;
    if (validations?.neq_status === "confirmed") vScore += 3;
    if (validations?.insurance_status === "confirmed") vScore += 3;
    scores.verification = Math.min(10, vScore);

    const filled = [
      profile.short_summary, profile.long_summary, profile.positioning,
      profile.primary_city, profile.contact, profile.legal_name,
    ].filter(Boolean).length;
    scores.completeness = Math.min(10, filled * 1.7);

    const total = Object.values(scores).reduce((a, b) => a + b, 0);

    await supabase.from("aipp_profile_scores").upsert({
      profile_id,
      identity_score: scores.identity,
      verification_score: scores.verification,
      services_score: scores.services,
      geography_score: scores.geography,
      media_score: scores.media,
      reviews_score: scores.reviews,
      freshness_score: scores.freshness,
      structured_data_score: scores.structured_data,
      trust_signals_score: scores.trust_signals,
      completeness_score: scores.completeness,
      total_score: total,
      computed_at: new Date().toISOString(),
    }, { onConflict: "profile_id" });

    return new Response(JSON.stringify({ ok: true, total, scores }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: e instanceof Error ? e.message : "Unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
