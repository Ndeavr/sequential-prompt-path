import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const { campaign_id, action } = await req.json();
    if (!campaign_id) throw new Error("campaign_id required");

    // Fetch campaign
    const { data: campaign, error: campErr } = await supabase
      .from("prospection_campaigns")
      .select("*")
      .eq("id", campaign_id)
      .single();
    if (campErr || !campaign) throw new Error("Campaign not found");

    if (action === "launch") {
      // Update campaign status
      await supabase.from("prospection_campaigns")
        .update({ status: "running", launched_at: new Date().toISOString() })
        .eq("id", campaign_id);

      // Create import job
      const { data: job } = await supabase.from("prospection_import_jobs").insert({
        campaign_id,
        job_status: "running",
        started_at: new Date().toISOString(),
      }).select().single();

      return new Response(
        JSON.stringify({ success: true, campaign_id, job_id: job?.id, message: "Campaign launched" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "pause") {
      await supabase.from("prospection_campaigns")
        .update({ status: "paused" })
        .eq("id", campaign_id);
      return new Response(
        JSON.stringify({ success: true, message: "Campaign paused" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "generate_alex_links") {
      // Generate Alex links for all scored prospects without one
      const { data: prospects } = await supabase
        .from("prospects")
        .select("id, business_name, main_city, aipp_pre_score, has_website, has_phone, has_email, has_reviews, has_google_presence")
        .eq("campaign_id", campaign_id)
        .gte("aipp_pre_score", 0);

      if (!prospects?.length) throw new Error("No prospects found");

      // Check which already have links
      const { data: existingLinks } = await supabase
        .from("prospect_alex_links")
        .select("prospect_id")
        .eq("campaign_id", campaign_id);
      const existingSet = new Set((existingLinks ?? []).map((l: any) => l.prospect_id));

      const newLinks = [];
      const baseUrl = req.headers.get("origin") || "https://sequential-prompt-path.lovable.app";

      for (const p of prospects) {
        if (existingSet.has(p.id)) continue;

        const token = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
        const prefill = {
          business_name: p.business_name,
          city: p.main_city,
          aipp_pre_score: p.aipp_pre_score,
          promo_code: campaign.default_promo_code || "SIGNATURE26",
          campaign_id,
        };

        newLinks.push({
          prospect_id: p.id,
          campaign_id,
          token,
          landing_url: `${baseUrl}/alex-landing?t=${token}`,
          prefill_json: prefill,
          is_active: true,
        });
      }

      if (newLinks.length > 0) {
        const { error: insertErr } = await supabase.from("prospect_alex_links").insert(newLinks);
        if (insertErr) throw insertErr;
      }

      return new Response(
        JSON.stringify({ success: true, generated: newLinks.length, total_prospects: prospects.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "calculate_scores") {
      // Calculate AIPP pre-scores for all unscored prospects
      const { data: prospects } = await supabase
        .from("prospects")
        .select("id, has_website, has_google_presence, has_reviews, has_phone, has_email, confidence_score")
        .eq("campaign_id", campaign_id)
        .eq("aipp_pre_score", 0);

      if (!prospects?.length) {
        return new Response(
          JSON.stringify({ success: true, scored: 0, message: "No prospects to score" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      let scored = 0;
      for (const p of prospects) {
        // Calculate pre-score based on available signals
        let score = 10; // Base
        if (p.has_website) score += 20;
        if (p.has_google_presence) score += 15;
        if (p.has_reviews) score += 20;
        if (p.has_phone) score += 10;
        if (p.has_email) score += 10;
        score += Math.min(15, (p.confidence_score || 0) * 0.15);
        score = Math.min(100, Math.round(score));

        const priority = score >= 70 ? "high" : score >= 45 ? "medium" : "low";

        await supabase.from("prospects")
          .update({ aipp_pre_score: score, priority_level: priority, status: "scored" })
          .eq("id", p.id);

        // Insert detailed scores
        await supabase.from("prospect_scores").insert({
          prospect_id: p.id,
          aipp_pre_score: score,
          web_presence_score: p.has_website ? 80 : 10,
          reviews_score: p.has_reviews ? 75 : 5,
          identity_clarity_score: (p.has_phone && p.has_email) ? 85 : p.has_phone ? 50 : 20,
          trust_signal_score: p.has_google_presence ? 70 : 15,
          service_clarity_score: 50,
          territory_clarity_score: 50,
          conversion_priority_score: score,
        });

        scored++;
      }

      return new Response(
        JSON.stringify({ success: true, scored }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[launch-prospection-campaign] ERROR:", msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
