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

    const { job_item_id, entities, property_id, quote_id } = await req.json();
    if (!job_item_id) {
      return new Response(JSON.stringify({ error: "job_item_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build structured analysis from entities
    const findAll = (type: string) => (entities || []).filter((e: any) => e.entity_type === type);
    const findFirst = (type: string) => findAll(type)[0]?.entity_value;

    const amounts = findAll("amount").map((e: any) => {
      const clean = e.entity_value.replace(/[\s,]/g, "").replace(",", ".");
      return parseFloat(clean) || 0;
    }).filter((v: number) => v > 0);

    const analysis = {
      contractor_name: findFirst("company_name") || null,
      license_number: findFirst("license_number") || null,
      total_amount: amounts.length > 0 ? Math.max(...amounts) : null,
      line_items: findAll("work_description").map((e: any) => e.entity_value),
      validity_date: findFirst("validity_date") || null,
      has_license: !!findFirst("license_number"),
      has_insurance_mention: (entities || []).some((e: any) => /assurance|insurance/i.test(e.entity_value || e.source_text || "")),
      item_count: findAll("work_description").length,
      price_breakdown_quality: amounts.length > 2 ? "detailed" : amounts.length > 0 ? "basic" : "missing",
    };

    // Score the quote quality (0-100)
    let qualityScore = 30; // base
    if (analysis.has_license) qualityScore += 15;
    if (analysis.has_insurance_mention) qualityScore += 10;
    if (analysis.price_breakdown_quality === "detailed") qualityScore += 20;
    else if (analysis.price_breakdown_quality === "basic") qualityScore += 10;
    if (analysis.line_items.length >= 3) qualityScore += 15;
    if (analysis.validity_date) qualityScore += 10;
    qualityScore = Math.min(100, qualityScore);

    // Save AI extraction
    if (property_id) {
      await supabase.from("property_ai_extractions").insert({
        property_id,
        job_item_id,
        extraction_type: "quote_analysis",
        source_doc_type: "contractor_quote",
        structured_data: { ...analysis, quality_score: qualityScore },
        confidence: 0.7,
        model_used: "regex_v1",
      });
    }

    // Update quote record if provided
    if (quote_id) {
      await supabase.from("quotes").update({
        analysis_result: { ...analysis, quality_score: qualityScore },
        status: "analyzed",
        updated_at: new Date().toISOString(),
      }).eq("id", quote_id);
    }

    // Create property event
    if (property_id) {
      await supabase.from("property_events").insert({
        property_id,
        event_type: "quote_analyzed",
        title: `Soumission analysée — ${analysis.contractor_name || "Entrepreneur"}`,
        description: `Montant: $${analysis.total_amount?.toLocaleString() || "N/A"} | Qualité: ${qualityScore}/100`,
        event_date: new Date().toISOString(),
      });
    }

    // Update job item
    await supabase.from("ingestion_job_items").update({
      status: "completed",
      extraction_result: { analysis, quality_score: qualityScore },
      updated_at: new Date().toISOString(),
    }).eq("id", job_item_id);

    return new Response(JSON.stringify({
      success: true,
      analysis,
      quality_score: qualityScore,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("Analyze quote error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
