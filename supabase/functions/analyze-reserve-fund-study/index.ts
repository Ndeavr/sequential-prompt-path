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

    const { job_item_id, entities, property_id, syndicate_id } = await req.json();
    if (!job_item_id) {
      return new Response(JSON.stringify({ error: "job_item_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const findAll = (type: string) => (entities || []).filter((e: any) => e.entity_type === type);
    const findFirst = (type: string) => findAll(type)[0]?.entity_value;
    const parseAmount = (val: string | undefined) => {
      if (!val) return null;
      return parseFloat(val.replace(/[\s,]/g, "").replace(",", ".")) || null;
    };

    const analysis = {
      total_reserve: parseAmount(findFirst("total_reserve")),
      annual_contribution: parseAmount(findFirst("contribution_annual")),
      deficit: parseAmount(findFirst("deficit")),
      components: findAll("component").map((e: any) => ({
        name: e.entity_value,
        useful_life: null,
      })),
      useful_lives: findAll("useful_life").map((e: any) => ({
        value: parseInt(e.entity_value) || null,
        source: e.source_text,
      })),
      health_status: "unknown" as string,
    };

    // Determine fund health
    if (analysis.total_reserve && analysis.annual_contribution) {
      const ratio = analysis.total_reserve / (analysis.annual_contribution * 25);
      if (ratio >= 0.8) analysis.health_status = "healthy";
      else if (ratio >= 0.5) analysis.health_status = "adequate";
      else if (ratio >= 0.3) analysis.health_status = "underfunded";
      else analysis.health_status = "critical";
    }

    // Save extraction
    if (property_id) {
      await supabase.from("property_ai_extractions").insert({
        property_id,
        job_item_id,
        extraction_type: "reserve_fund_analysis",
        source_doc_type: "reserve_fund_study",
        structured_data: analysis,
        confidence: 0.65,
        model_used: "regex_v1",
      });
    }

    // If syndicate, create reserve fund snapshot
    if (syndicate_id && analysis.total_reserve) {
      await supabase.from("syndicate_reserve_fund_snapshots").insert({
        syndicate_id,
        snapshot_date: new Date().toISOString().split("T")[0],
        total_balance: analysis.total_reserve,
        annual_contribution: analysis.annual_contribution || 0,
        notes: `Auto-extrait de l'étude du fonds de prévoyance. Santé: ${analysis.health_status}`,
      });
    }

    // Property event
    if (property_id) {
      await supabase.from("property_events").insert({
        property_id,
        event_type: "document_ingested",
        title: "Étude du fonds de prévoyance analysée",
        description: `Fonds: $${analysis.total_reserve?.toLocaleString() || "N/A"} | Santé: ${analysis.health_status}`,
        event_date: new Date().toISOString(),
      });
    }

    await supabase.from("ingestion_job_items").update({
      status: "completed",
      extraction_result: analysis,
      updated_at: new Date().toISOString(),
    }).eq("id", job_item_id);

    return new Response(JSON.stringify({ success: true, analysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Analyze reserve fund error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
