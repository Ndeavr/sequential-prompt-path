// Omega Conductor — daily autonomous loop dispatcher
// Triggered by pg_cron with ?phase=<phase_name>
// Each phase invokes existing engines and writes status to omega_loop_runs.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PHASE_INVOCATIONS: Record<string, string[]> = {
  prospect_discovery:    ["sniper-import-targets", "war-prospecting-engine"],
  enrichment:            ["enrich-prospect", "sniper-enrich-target"],
  scoring:               ["aipp-real-scan", "edge-generate-aipp-preview"],
  campaign_generation:   ["campaign-generator", "sniper-generate-assets"],
  outreach_send:         ["process-outbound-queue", "sniper-queue-send"],
  reply_handling:        ["edge-classify-reply-intent"],
  alex_closing:          ["alex-autopilot-evaluate", "alex-reengage-check"],
  payment_followup:      ["admin-activation-subscribe"],
  onboarding_activation: ["activate-contractor-plan", "contractor-activation-enrich"],
  expansion_scan:        ["expansion-detector"],
  churn_rescue:          ["churn-detector"],
  metrics_optimize:      ["fn-omega-rollup-metrics", "sniper-update-heat"],
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const phase = url.searchParams.get("phase") ||
                (await req.json().catch(() => ({}))).phase;

  if (!phase || !PHASE_INVOCATIONS[phase]) {
    return new Response(JSON.stringify({ error: "invalid_phase", phase }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const { data: run, error: insertErr } = await supabase
    .from("omega_loop_runs")
    .insert({ phase, status: "running" })
    .select("id")
    .single();

  if (insertErr) {
    console.error("[omega-conductor] insert failed", insertErr);
    return new Response(JSON.stringify({ error: insertErr.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const stats: Record<string, unknown> = {};
  const errors: { fn: string; error: string }[] = [];

  for (const fn of PHASE_INVOCATIONS[phase]) {
    try {
      const { data, error } = await supabase.functions.invoke(fn, {
        body: { triggered_by: "omega-conductor", phase, run_id: run.id },
      });
      if (error) {
        errors.push({ fn, error: error.message ?? String(error) });
        console.error(`[omega-conductor] ${fn} failed`, error);
      } else {
        stats[fn] = data?.summary ?? data ?? "ok";
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push({ fn, error: msg });
      console.error(`[omega-conductor] ${fn} threw`, msg);
    }
  }

  const status = errors.length === 0 ? "success"
              : errors.length < PHASE_INVOCATIONS[phase].length ? "success" : "failed";

  await supabase.from("omega_loop_runs")
    .update({ status, ended_at: new Date().toISOString(), stats, errors })
    .eq("id", run.id);

  return new Response(JSON.stringify({ run_id: run.id, phase, status, stats, errors }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
