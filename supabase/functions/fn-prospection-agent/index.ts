import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

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

    const now = new Date().toISOString();

    // 1. Fetch active rules that are due to run
    const { data: rules, error: rulesErr } = await supabase
      .from("prospection_agent_rules")
      .select("*")
      .eq("is_active", true)
      .or(`next_run_at.is.null,next_run_at.lte.${now}`)
      .order("priority", { ascending: true }) // highest priority first
      .limit(10);

    if (rulesErr) throw rulesErr;

    if (!rules || rules.length === 0) {
      return new Response(JSON.stringify({ message: "No rules due", jobs_launched: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const results: any[] = [];

    for (const rule of rules) {
      // Check active job count for this rule's category to avoid flooding
      const { count } = await supabase
        .from("prospection_jobs")
        .select("id", { count: "exact", head: true })
        .eq("target_category", rule.target_category)
        .in("job_status", ["pending", "running"]);

      if ((count ?? 0) >= rule.max_concurrent_jobs) {
        results.push({ rule: rule.rule_name, skipped: true, reason: "max concurrent jobs reached" });
        continue;
      }

      const cities = (rule.target_cities_json || []) as string[];
      const keywords = (rule.keywords_json || []) as string[];

      // Launch job via the existing start function
      const response = await fetch(`${supabaseUrl}/functions/v1/fn-start-prospection-job`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({
          job_name: `[AUTO] ${rule.rule_name} — ${new Date().toLocaleDateString("fr-CA")}`,
          target_category: rule.target_category,
          target_cities: cities,
          radius_km: rule.radius_km,
          keywords,
          languages: ["fr"],
        }),
      });

      const jobResult = await response.json();

      // Update rule scheduling
      const nextRun = new Date(Date.now() + rule.frequency_hours * 60 * 60 * 1000).toISOString();
      await supabase
        .from("prospection_agent_rules")
        .update({
          last_run_at: now,
          next_run_at: nextRun,
          total_jobs_run: (rule.total_jobs_run || 0) + 1,
        })
        .eq("id", rule.id);

      results.push({
        rule: rule.rule_name,
        type: rule.rule_type,
        priority: rule.priority,
        job_id: jobResult.job_id,
        queries_generated: jobResult.queries_generated,
        next_run: nextRun,
      });
    }

    return new Response(JSON.stringify({
      success: true,
      agent_run_at: now,
      rules_evaluated: rules.length,
      results,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("fn-prospection-agent error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
