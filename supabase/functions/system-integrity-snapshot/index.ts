/**
 * UNPRO — System Integrity Snapshot
 * Reads live views, persists a health snapshot, returns the full integrity payload.
 */
import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const PIPELINES = [
  { key: "scraping", view: "v_pipeline_scraping_health" },
  { key: "sms", view: "v_pipeline_sms_health" },
  { key: "email", view: "v_pipeline_email_health" },
  { key: "onboarding", view: "v_pipeline_onboarding_health" },
  { key: "stripe", view: "v_pipeline_stripe_health" },
  { key: "matching", view: "v_pipeline_matching_health" },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

    const pipelines: Record<string, unknown> = {};
    for (const p of PIPELINES) {
      const { data, error } = await supabase.from(p.view).select("*").maybeSingle();
      pipelines[p.key] = error ? { error: error.message } : (data ?? {});
    }

    const { data: score } = await supabase.from("v_system_health_score").select("*").maybeSingle();
    const { data: funnel } = await supabase.from("v_first_paid_contractor_funnel").select("*").maybeSingle();

    if (score?.overall_score != null) {
      await supabase.from("system_health_snapshots").insert({
        overall_score: score.overall_score,
        status: score.status,
        pipeline_scores: score.pipeline_scores ?? {},
      });
    }

    return new Response(
      JSON.stringify({ ok: true, score, pipelines, funnel, captured_at: new Date().toISOString() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[system-integrity-snapshot]", e);
    return new Response(
      JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
