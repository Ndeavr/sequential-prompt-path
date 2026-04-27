import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.0";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.99.0/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { task_id } = await req.json();
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Gather completed runs
    const query = task_id
      ? sb.from("execution_runs").select("*").eq("task_id", task_id)
      : sb.from("execution_runs").select("*").order("finished_at", { ascending: false }).limit(100);
    const { data: runs } = await query;

    if (!runs?.length) {
      return new Response(JSON.stringify({ message: "No runs to learn from", insights: [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Group by run_type and compute stats
    const groups: Record<string, { totalCredits: number; totalDuration: number; successes: number; count: number; estimated: number }> = {};
    for (const r of runs) {
      const key = r.run_type || "unknown";
      if (!groups[key]) groups[key] = { totalCredits: 0, totalDuration: 0, successes: 0, count: 0, estimated: 0 };
      groups[key].count++;
      groups[key].totalCredits += r.credits_actual || 0;
      groups[key].totalDuration += r.duration_ms || 0;
      groups[key].estimated += r.credits_estimated || 0;
      if (r.run_status === "completed") groups[key].successes++;
    }

    const insights: any[] = [];
    for (const [taskType, stats] of Object.entries(groups)) {
      const successRate = stats.count > 0 ? Math.round((stats.successes / stats.count) * 100) / 100 : 0;
      const avgDuration = stats.count > 0 ? Math.round(stats.totalDuration / stats.count) : 0;
      const avgCredits = stats.count > 0 ? Math.round(stats.totalCredits / stats.count) : 0;
      const costEfficiency = stats.estimated > 0 ? Math.round((stats.totalCredits / stats.estimated) * 100) : 100;

      const insight = {
        task_type: taskType, complexity_score: null, estimated_credits: Math.round(stats.estimated / stats.count),
        actual_credits: avgCredits, success_rate: successRate, avg_duration_ms: avgDuration,
        sample_count: stats.count, insights_json: { cost_efficiency_pct: costEfficiency, over_budget: costEfficiency > 120, under_budget: costEfficiency < 80 },
      };
      insights.push(insight);

      // Upsert learning log
      await sb.from("execution_learning_logs").upsert({
        task_type: taskType, complexity_score: insight.complexity_score,
        estimated_credits: insight.estimated_credits, actual_credits: insight.actual_credits,
        success_rate: successRate, avg_duration_ms: avgDuration,
        sample_count: stats.count, insights_json: insight.insights_json, updated_at: new Date().toISOString(),
      }, { onConflict: "task_type", ignoreDuplicates: false });
    }

    return new Response(JSON.stringify({ insights, runs_analyzed: runs.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
