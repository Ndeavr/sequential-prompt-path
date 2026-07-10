// daily-outreach-orchestrator — chains scrape → score → dispatch
// Designed to be triggered by pg_cron daily at 07:00 America/Montreal.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const TARGET_CITIES = ["Laval", "Terrebonne", "Repentigny", "Mascouche", "Saint-Jérôme", "Mirabel"];
const TARGET_TRADES = ["couvreur", "isolation", "cvac", "electricien", "plombier"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const body = await req.json().catch(() => ({}));
  const dryRun = body.dry_run !== false;
  const dispatchLimit = Number(body.dispatch_limit ?? 30);

  const runId = crypto.randomUUID();
  const started = Date.now();
  const steps: Array<{ name: string; ok: boolean; details?: unknown }> = [];

  try {
    // 1) Score all unscored prospects
    const { data: scoreRes, error: scoreErr } = await supabase.functions.invoke(
      "compute-prospect-priority",
      { body: { only_missing: true, limit: 500 } },
    );
    steps.push({ name: "score", ok: !scoreErr, details: scoreErr ?? scoreRes });

    // 2) Refresh template winner
    const { data: winRes, error: winErr } = await supabase.functions.invoke(
      "refresh-template-winner",
      { body: {} },
    );
    steps.push({ name: "refresh_winner", ok: !winErr, details: winErr ?? winRes });

    // 3) Dispatch (dry_run driven by top-level flag)
    const { data: dispRes, error: dispErr } = await supabase.functions.invoke(
      "dispatch-priority-outreach",
      { body: { limit: dispatchLimit, dry_run: dryRun } },
    );
    steps.push({ name: "dispatch", ok: !dispErr, details: dispErr ?? dispRes });

    // 4) Activation recovery
    const { data: recRes, error: recErr } = await supabase.functions.invoke(
      "activation-recovery-worker",
      { body: { dry_run: dryRun } },
    );
    steps.push({ name: "recovery", ok: !recErr, details: recErr ?? recRes });

    // Log to pipeline_logs
    await supabase.from("pipeline_logs").insert({
      run_id: runId,
      stage: "daily_outreach_orchestrator",
      status: steps.every(s => s.ok) ? "success" : "partial_failure",
      duration_ms: Date.now() - started,
      metadata: { steps, dry_run: dryRun, cities: TARGET_CITIES, trades: TARGET_TRADES },
    } as never).select().maybeSingle();

    return new Response(JSON.stringify({ run_id: runId, steps, duration_ms: Date.now() - started }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[daily-outreach-orchestrator]", e);
    return new Response(JSON.stringify({ error: String(e instanceof Error ? e.message : e), steps }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
