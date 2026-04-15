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
    const { snapshot_id, prospect_id } = body;

    if (!snapshot_id) {
      return new Response(
        JSON.stringify({ error: "snapshot_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 1. Load snapshot
    const { data: snapshot, error: loadError } = await supabase
      .from("contractor_import_snapshots")
      .select("*")
      .eq("id", snapshot_id)
      .single();

    if (loadError || !snapshot) {
      return new Response(
        JSON.stringify({ error: "Snapshot not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const biz = snapshot.business_payload as any || {};
    const enrichment: Record<string, any> = {};

    // 2. Detect domain from website
    if (biz.website) {
      const domain = biz.website.replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/^www\./, "");
      enrichment.domain = domain;
    }

    // 3. Detect RBQ from business name or website (pattern-based)
    const rbqPattern = /(\d{4}[-\s]?\d{4}[-\s]?\d{2})/;
    const rbqMatch = (snapshot.business_name || "").match(rbqPattern);
    if (rbqMatch) {
      enrichment.detected_rbq = rbqMatch[1].replace(/\s/g, "-");
    }

    // 4. Detect NEQ (10-digit Quebec business number)
    const neqPattern = /\b(\d{10})\b/;
    const neqMatch = (snapshot.business_name || "").match(neqPattern);
    if (neqMatch) {
      enrichment.detected_neq = neqMatch[1];
    }

    // 5. Calculate enrichment score
    let enrichmentScore = 0;
    if (biz.phone) enrichmentScore += 15;
    if (biz.website) enrichmentScore += 15;
    if (biz.rating > 0) enrichmentScore += 10;
    if (biz.review_count > 10) enrichmentScore += 10;
    if (biz.categories?.length > 0) enrichmentScore += 10;
    if (enrichment.domain) enrichmentScore += 10;
    if (enrichment.detected_rbq) enrichmentScore += 15;
    if (enrichment.detected_neq) enrichmentScore += 15;
    enrichment.enrichment_score = enrichmentScore;

    // 6. Generate credibility signals
    enrichment.credibility_signals = [];
    if (biz.rating >= 4.0) enrichment.credibility_signals.push("high_google_rating");
    if (biz.review_count >= 20) enrichment.credibility_signals.push("established_reviews");
    if (biz.website) enrichment.credibility_signals.push("has_website");
    if (biz.phone) enrichment.credibility_signals.push("has_phone");
    if (biz.opening_hours) enrichment.credibility_signals.push("has_hours");

    // 7. Update snapshot with enrichment
    await supabase
      .from("contractor_import_snapshots")
      .update({ enrichment_payload: enrichment })
      .eq("id", snapshot_id);

    // 8. Update prospect status if applicable
    if (prospect_id) {
      await supabase
        .from("prospects")
        .update({ status: "enriched" })
        .eq("id", prospect_id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        snapshot_id,
        enrichment,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("enrich-business-profile error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
