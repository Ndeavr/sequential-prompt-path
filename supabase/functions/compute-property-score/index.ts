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

    const { property_id, user_id } = await req.json();
    if (!property_id) {
      return new Response(JSON.stringify({ error: "property_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Gather property data
    const [propRes, masterRes, eventsRes, docsRes, extractionsRes, quotesRes] = await Promise.all([
      supabase.from("properties").select("*").eq("id", property_id).single(),
      supabase.from("property_master_records").select("*").eq("property_id", property_id).maybeSingle(),
      supabase.from("property_events").select("id, event_type").eq("property_id", property_id),
      supabase.from("storage_documents").select("id", { count: "exact", head: true }).eq("entity_id", property_id),
      supabase.from("property_ai_extractions").select("id", { count: "exact", head: true }).eq("property_id", property_id),
      supabase.from("quotes").select("id", { count: "exact", head: true }).eq("property_id", property_id),
    ]);

    const property = propRes.data;
    const master = masterRes.data;
    const events = eventsRes.data || [];
    const docCount = docsRes.count || 0;
    const extractionCount = extractionsRes.count || 0;
    const quoteCount = quotesRes.count || 0;

    // Scoring dimensions (0-100 each)
    // Structure score: based on year built, building type
    let structureScore = 50;
    const yearBuilt = master?.year_built || property?.year_built;
    if (yearBuilt) {
      const age = new Date().getFullYear() - yearBuilt;
      if (age < 5) structureScore = 95;
      else if (age < 15) structureScore = 85;
      else if (age < 30) structureScore = 70;
      else if (age < 50) structureScore = 55;
      else if (age < 80) structureScore = 40;
      else structureScore = 30;
    }

    // Documentation score: based on uploaded docs and extractions
    let documentationScore = 20;
    if (docCount > 0) documentationScore += Math.min(30, docCount * 10);
    if (extractionCount > 0) documentationScore += Math.min(30, extractionCount * 15);
    if (master) documentationScore += 20;
    documentationScore = Math.min(100, documentationScore);

    // Maintenance score: based on events
    const renovations = events.filter(e => e.event_type === "renovation").length;
    const repairs = events.filter(e => e.event_type === "repair").length;
    const inspections = events.filter(e => e.event_type === "inspection").length;
    let maintenanceScore = 30;
    maintenanceScore += Math.min(25, renovations * 10);
    maintenanceScore += Math.min(20, repairs * 5);
    maintenanceScore += Math.min(25, inspections * 15);
    maintenanceScore = Math.min(100, maintenanceScore);

    // Intelligence score: quotes and AI analysis
    let intelligenceScore = 10;
    intelligenceScore += Math.min(40, quoteCount * 15);
    intelligenceScore += Math.min(50, extractionCount * 20);
    intelligenceScore = Math.min(100, intelligenceScore);

    // Overall weighted score
    const overall = Math.round(
      structureScore * 0.3 +
      documentationScore * 0.25 +
      maintenanceScore * 0.25 +
      intelligenceScore * 0.2
    );

    // Save score
    const scoreData = {
      property_id,
      user_id: user_id || null,
      overall_score: overall,
      structure_score: structureScore,
      interior_score: documentationScore, // repurposed as documentation
      exterior_score: maintenanceScore, // repurposed as maintenance
      systems_score: intelligenceScore, // repurposed as intelligence
      calculated_at: new Date().toISOString(),
      notes: `Auto-computed: struct=${structureScore} doc=${documentationScore} maint=${maintenanceScore} intel=${intelligenceScore}`,
    };

    await supabase.from("home_scores").insert(scoreData);

    // Also save to property_scores if it exists
    await supabase.from("property_scores").insert({
      property_id,
      score_type: "home_score",
      overall_score: overall,
      dimension_scores: {
        structure: structureScore,
        documentation: documentationScore,
        maintenance: maintenanceScore,
        intelligence: intelligenceScore,
      },
    }).then(() => {}).catch(() => {});

    return new Response(JSON.stringify({
      success: true,
      score: {
        overall,
        structure: structureScore,
        documentation: documentationScore,
        maintenance: maintenanceScore,
        intelligence: intelligenceScore,
      },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("Compute property score error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
