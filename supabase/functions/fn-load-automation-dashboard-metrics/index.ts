import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString();

    const [agents, jobs, runs, blockers, actionLogs] = await Promise.all([
      supabase.from("automation_agents").select("id, key, name, category, is_enabled, last_run_at, last_status"),
      supabase.from("automation_jobs").select("id, status, job_type, priority, started_at, finished_at, duration_ms, created_at").gte("created_at", todayStr).limit(500),
      supabase.from("automation_runs").select("id, status, jobs_found, jobs_executed, jobs_succeeded, jobs_failed, run_started_at, created_at").gte("created_at", todayStr).limit(200),
      supabase.from("automation_blockers").select("id, severity_level, blocker_type, engine_name, status").eq("status", "open"),
      supabase.from("automation_action_logs").select("id, engine_name, action_type, action_status, created_at").gte("created_at", todayStr).order("created_at", { ascending: false }).limit(100),
    ]);

    const jobList = jobs.data ?? [];
    const runList = runs.data ?? [];
    const blockerList = blockers.data ?? [];

    // Volume by hour
    const hourlyVolume: Record<number, { total: number; succeeded: number; failed: number }> = {};
    for (let h = 0; h < 24; h++) hourlyVolume[h] = { total: 0, succeeded: 0, failed: 0 };
    for (const j of jobList) {
      const h = new Date(j.created_at).getHours();
      hourlyVolume[h].total++;
      if (j.status === "completed") hourlyVolume[h].succeeded++;
      if (j.status === "failed") hourlyVolume[h].failed++;
    }

    // By engine
    const byEngine: Record<string, number> = {};
    for (const j of jobList) {
      const e = j.job_type ?? "unknown";
      byEngine[e] = (byEngine[e] ?? 0) + 1;
    }

    // Failure reasons
    const failureTypes: Record<string, number> = {};
    for (const b of blockerList) {
      failureTypes[b.blocker_type] = (failureTypes[b.blocker_type] ?? 0) + 1;
    }

    const metrics = {
      summary: {
        total_jobs_today: jobList.length,
        running: jobList.filter(j => j.status === "running").length,
        completed: jobList.filter(j => j.status === "completed").length,
        failed: jobList.filter(j => j.status === "failed").length,
        queued: jobList.filter(j => j.status === "queued").length,
        blocked: blockerList.filter(b => b.status === "open").length,
        critical_blockers: blockerList.filter(b => b.severity_level === "critical").length,
        success_rate: jobList.length > 0 ? Math.round(jobList.filter(j => j.status === "completed").length / jobList.length * 100) : 0,
        avg_duration_ms: jobList.filter(j => j.duration_ms).reduce((s, j) => s + (j.duration_ms ?? 0), 0) / (jobList.filter(j => j.duration_ms).length || 1),
        active_agents: (agents.data ?? []).filter((a: any) => a.is_enabled).length,
        total_agents: (agents.data ?? []).length,
      },
      hourly_volume: Object.entries(hourlyVolume).map(([h, v]) => ({ hour: Number(h), ...v })),
      by_engine: Object.entries(byEngine).map(([engine, count]) => ({ engine, count })),
      failure_reasons: Object.entries(failureTypes).map(([type, count]) => ({ type, count })),
      recent_actions: (actionLogs.data ?? []).slice(0, 20),
    };

    return new Response(JSON.stringify(metrics), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
