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

    // Detect stuck jobs (running > 10 min)
    const tenMinAgo = new Date(Date.now() - 10 * 60_000).toISOString();
    const { data: stuckJobs } = await supabase
      .from("automation_jobs")
      .select("id, job_type, agent_id, started_at")
      .eq("status", "running")
      .lt("started_at", tenMinAgo)
      .limit(50);

    const blockers: any[] = [];

    for (const job of stuckJobs ?? []) {
      blockers.push({
        blocker_key: `stuck-job-${job.id}`,
        engine_name: job.job_type ?? "unknown",
        job_id: job.id,
        severity_level: "high",
        blocker_type: "timeout",
        blocker_title: `Job bloqué depuis >10min`,
        blocker_message: `Job ${job.job_type} démarré à ${job.started_at}`,
        suggested_resolution: "Retry ou annuler le job",
        retry_possible: true,
        status: "open",
      });
    }

    // Detect failed jobs with retries remaining
    const { data: failedJobs } = await supabase
      .from("automation_jobs")
      .select("id, job_type, attempts, max_attempts, error_message")
      .eq("status", "failed")
      .limit(50);

    for (const job of failedJobs ?? []) {
      if ((job.attempts ?? 0) < (job.max_attempts ?? 3)) {
        blockers.push({
          blocker_key: `failed-retryable-${job.id}`,
          engine_name: job.job_type ?? "unknown",
          job_id: job.id,
          severity_level: "medium",
          blocker_type: "error",
          blocker_title: `Job échoué — retry possible`,
          blocker_message: job.error_message ?? "Erreur inconnue",
          suggested_resolution: `Retry (${job.attempts}/${job.max_attempts})`,
          retry_possible: true,
          status: "open",
        });
      }
    }

    // Upsert blockers
    if (blockers.length > 0) {
      for (const b of blockers) {
        const { data: existing } = await supabase
          .from("automation_blockers")
          .select("id")
          .eq("blocker_key", b.blocker_key)
          .eq("status", "open")
          .maybeSingle();
        if (!existing) {
          await supabase.from("automation_blockers").insert(b);
        }
      }
    }

    return new Response(JSON.stringify({ detected: blockers.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
