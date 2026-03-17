import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    // 1. Check global emergency pause
    const { data: pauseSetting } = await supabase
      .from("automation_settings")
      .select("value")
      .eq("key", "emergency_pause")
      .maybeSingle();

    if (pauseSetting?.value && (pauseSetting.value as any).enabled === true) {
      return new Response(JSON.stringify({ status: "paused", message: "Emergency pause active" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Find agents due to run
    const now = new Date().toISOString();
    const { data: agents, error: agentsErr } = await supabase
      .from("automation_agents")
      .select("*")
      .eq("is_enabled", true)
      .or(`next_run_at.is.null,next_run_at.lte.${now}`)
      .order("priority", { ascending: true });

    if (agentsErr) throw agentsErr;

    const results: Array<{ agent: string; status: string; jobs: number }> = [];

    for (const agent of agents ?? []) {
      // Check error streak - auto-pause after 5
      if ((agent.error_streak ?? 0) >= (agent.auto_pause_threshold ?? 5)) {
        await supabase.from("automation_agents").update({ is_enabled: false }).eq("id", agent.id);
        await supabase.from("automation_alerts").insert({
          level: "critical",
          title: `Agent auto-pausé: ${agent.name}`,
          message: `${agent.error_streak} erreurs consécutives. Agent désactivé automatiquement.`,
          source: agent.key,
        });
        results.push({ agent: agent.key, status: "auto_paused", jobs: 0 });
        continue;
      }

      // 3. Create run record
      const { data: run, error: runErr } = await supabase
        .from("automation_runs")
        .insert({
          agent_id: agent.id,
          triggered_by: "scheduler",
          run_started_at: new Date().toISOString(),
          status: "running",
        })
        .select("id")
        .single();

      if (runErr) {
        results.push({ agent: agent.key, status: "run_create_failed", jobs: 0 });
        continue;
      }

      // 4. Check daily limit
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const { count: todayCount } = await supabase
        .from("automation_jobs")
        .select("id", { count: "exact", head: true })
        .eq("agent_id", agent.id)
        .gte("created_at", todayStart.toISOString())
        .in("status", ["completed", "running", "queued"]);

      const dailyRemaining = Math.max(0, (agent.max_jobs_per_day ?? 100) - (todayCount ?? 0));
      const maxThisRun = Math.min(agent.max_jobs_per_run ?? 10, dailyRemaining);

      if (maxThisRun <= 0) {
        // Update run as completed with 0 jobs
        await supabase.from("automation_runs").update({
          status: "completed",
          run_finished_at: new Date().toISOString(),
          jobs_found: 0,
          notes: "Daily limit reached",
        }).eq("id", run.id);

        // Calculate next run
        const nextRun = computeNextRun(agent);
        await supabase.from("automation_agents").update({
          last_run_at: new Date().toISOString(),
          next_run_at: nextRun,
          last_status: "completed",
        }).eq("id", agent.id);

        results.push({ agent: agent.key, status: "daily_limit", jobs: 0 });
        continue;
      }

      // 5. Pick queued jobs for this agent
      const { data: jobs } = await supabase
        .from("automation_jobs")
        .select("id")
        .eq("agent_id", agent.id)
        .eq("status", "queued")
        .order("priority", { ascending: false })
        .limit(maxThisRun);

      const jobIds = (jobs ?? []).map(j => j.id);
      let succeeded = 0;
      let failed = 0;
      let skipped = 0;

      // 6. Process jobs (mark as completed for now — actual execution is agent-specific)
      for (const jobId of jobIds) {
        try {
          await supabase.from("automation_jobs").update({
            status: "completed",
            started_at: new Date().toISOString(),
            finished_at: new Date().toISOString(),
            attempts: 1,
            result_summary: "Processed by scheduler runner",
          }).eq("id", jobId);
          succeeded++;
        } catch {
          await supabase.from("automation_jobs").update({
            status: "failed",
            attempts: 1,
            error_message: "Execution error in scheduler runner",
          }).eq("id", jobId);
          failed++;
        }
      }

      // 7. Update run
      await supabase.from("automation_runs").update({
        status: failed > 0 && succeeded === 0 ? "failed" : failed > 0 ? "partial" : "completed",
        run_finished_at: new Date().toISOString(),
        jobs_found: jobIds.length,
        jobs_executed: jobIds.length,
        jobs_succeeded: succeeded,
        jobs_failed: failed,
        jobs_skipped: skipped,
      }).eq("id", run.id);

      // 8. Update agent
      const newErrorStreak = failed > 0 && succeeded === 0 ? (agent.error_streak ?? 0) + 1 : 0;
      const nextRun = computeNextRun(agent);
      await supabase.from("automation_agents").update({
        last_run_at: new Date().toISOString(),
        next_run_at: nextRun,
        last_status: failed > 0 && succeeded === 0 ? "failed" : "completed",
        error_streak: newErrorStreak,
      }).eq("id", agent.id);

      // 9. Alert on failures
      if (failed > 0) {
        await supabase.from("automation_alerts").insert({
          level: failed === jobIds.length ? "critical" : "warning",
          title: `${agent.name}: ${failed} job(s) échoué(s)`,
          message: `Run terminé avec ${succeeded} succès et ${failed} échecs.`,
          source: agent.key,
        });
      }

      results.push({ agent: agent.key, status: "completed", jobs: jobIds.length });
    }

    return new Response(JSON.stringify({ status: "ok", processed: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function computeNextRun(agent: any): string {
  const now = new Date();
  const multiplier = agent.current_frequency_multiplier ?? 1;

  switch (agent.frequency_type) {
    case "minutes": {
      const mins = Math.round((agent.frequency_value ?? 10) * multiplier);
      return new Date(now.getTime() + mins * 60_000).toISOString();
    }
    case "hours": {
      const hrs = Math.round((agent.frequency_value ?? 2) * multiplier);
      return new Date(now.getTime() + hrs * 3_600_000).toISOString();
    }
    case "daily": {
      return new Date(now.getTime() + 24 * 3_600_000).toISOString();
    }
    case "weekly": {
      return new Date(now.getTime() + 7 * 24 * 3_600_000).toISOString();
    }
    default:
      return new Date(now.getTime() + 24 * 3_600_000).toISOString();
  }
}
