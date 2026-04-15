import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { candidate, onboarding_session_id, user_id, import_source } = body;

    if (!candidate?.place_id && !candidate?.business_name) {
      return new Response(
        JSON.stringify({ error: "candidate.place_id or candidate.business_name required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 1. Save import snapshot
    const { data: snapshot, error: snapError } = await supabase
      .from("contractor_import_snapshots")
      .insert({
        onboarding_session_id: onboarding_session_id || null,
        user_id: user_id || null,
        google_place_id: candidate.place_id || null,
        business_name: candidate.name || candidate.business_name || "Inconnu",
        business_payload: {
          formatted_address: candidate.formatted_address || "",
          phone: candidate.phone || "",
          website: candidate.website || "",
          rating: candidate.rating || 0,
          review_count: candidate.review_count || 0,
          categories: candidate.all_categories || [],
          photos: candidate.photos || [],
          opening_hours: candidate.opening_hours || null,
          confidence_score: candidate.confidence_score || 0,
          strategy_used: candidate.strategy_used || "manual",
        },
        import_source: import_source || "gmb",
      })
      .select("id")
      .single();

    if (snapError) {
      console.error("Snapshot error:", snapError);
      return new Response(
        JSON.stringify({ error: "Failed to save import snapshot", details: snapError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Create or update prospect if prospect pipeline is used
    let prospectId: string | null = null;
    if (candidate.business_name || candidate.name) {
      const { data: prospect } = await supabase
        .from("prospects")
        .insert({
          business_name: candidate.name || candidate.business_name,
          full_name: candidate.name || candidate.business_name,
          city: candidate.formatted_address?.split(",").slice(-2, -1)[0]?.trim() || "",
          phone: candidate.phone || null,
          website: candidate.website || null,
          category: candidate.primary_category || null,
          source_type: import_source || "gmb",
          status: "matched",
        })
        .select("id")
        .single();

      prospectId = prospect?.id || null;
    }

    return new Response(
      JSON.stringify({
        success: true,
        snapshot_id: snapshot.id,
        prospect_id: prospectId,
        message: `${candidate.name || candidate.business_name} importé avec succès`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("import-business-profile error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
