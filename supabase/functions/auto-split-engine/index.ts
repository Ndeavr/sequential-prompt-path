import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.0";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.99.0/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { task_id } = await req.json();
    if (!task_id) return new Response(JSON.stringify({ error: "task_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: task } = await sb.from("execution_tasks").select("*").eq("id", task_id).single();
    if (!task) return new Response(JSON.stringify({ error: "Task not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const scope = task.requested_scope_json || task.breakdown_json || {};
    const score = task.advanced_score || task.estimated_complexity_score || 0;

    // Check learning memory for adjusted score
    const { data: learning } = await sb.from("execution_learning_logs").select("*").eq("task_type", task.module_name || "general").order("updated_at", { ascending: false }).limit(1);
    
    let adjustedScore = score;
    if (learning?.[0]?.success_rate != null && learning[0].success_rate < 0.5) {
      adjustedScore = Math.round(score * 1.3); // inflate if historically fails
    }

    // Dynamic split based on actual scope keys with values > 0
    const AGENT_MAP: Record<string, string> = {
      tables_count: "execution_runner", components_count: "execution_runner",
      pages_count: "execution_runner", edge_functions: "execution_runner",
      api_calls: "execution_runner", automation_needed: "task_splitter",
      cron_jobs: "execution_runner", image_generation: "cost_optimizer",
      data_volume: "execution_runner", dependencies_count: "execution_runner",
    };
    const PHASE_ORDER = ["tables_count", "edge_functions", "components_count", "pages_count", "api_calls", "automation_needed", "cron_jobs", "data_volume", "image_generation", "dependencies_count"];
    const PHASE_LABELS: Record<string, string> = {
      tables_count: "Data layer", edge_functions: "Backend functions",
      components_count: "UI components", pages_count: "Pages & routing",
      api_calls: "API integrations", automation_needed: "Automations",
      cron_jobs: "Scheduled jobs", data_volume: "Data seeding",
      image_generation: "Visual assets", dependencies_count: "Dependencies",
    };

    const steps: any[] = [];
    const agentTasks: any[] = [];

    for (const key of PHASE_ORDER) {
      const count = Number(scope[key]?.count ?? scope[key] ?? 0);
      if (count <= 0) continue;
      const weight = Number(scope[key]?.weight ?? 1);
      const stepCredits = Math.round(count * weight * 1.5 + 3);
      const step = {
        step: steps.length + 1,
        label: `${PHASE_LABELS[key] || key}: ${count} élément(s)`,
        type: key, count, estimated_credits: stepCredits,
        priority: steps.length < 2 ? "critical" : steps.length < 4 ? "high" : "low",
        agent: AGENT_MAP[key] || "execution_runner",
      };
      steps.push(step);
      agentTasks.push({ parent_task_id: task_id, agent_type: step.agent, task_payload: step, status: "pending" });
    }

    if (steps.length === 0) {
      steps.push({ step: 1, label: "Exécution complète", type: "full", estimated_credits: 10, priority: "critical", agent: "execution_runner" });
    }

    // Save split plan
    const { data: existing } = await sb.from("execution_split_plans").select("split_version").eq("task_id", task_id).order("split_version", { ascending: false }).limit(1);
    const nextVersion = (existing?.[0]?.split_version || 0) + 1;
    await sb.from("execution_split_plans").insert({ task_id, split_version: nextVersion, split_steps_json: steps, current_step_index: 0, split_status: "pending_evaluation" });

    // Save agent tasks
    if (agentTasks.length > 0) {
      await sb.from("execution_agent_tasks").insert(agentTasks);
    }

    // Update task
    await sb.from("execution_tasks").update({
      current_status: "split_into_smaller_tasks", auto_split_enabled: true, learning_adjusted_score: adjustedScore,
    }).eq("id", task_id);

    // Log decision
    await sb.from("execution_decisions").insert({
      task_id, decision_type: "auto_split_dynamic", decision_reason: `Score ${score} (ajusté: ${adjustedScore}) → split en ${steps.length} étapes`,
      selected_strategy: "dynamic_split", score_snapshot: adjustedScore,
    });

    return new Response(JSON.stringify({ steps, agents_created: agentTasks.length, adjusted_score: adjustedScore, split_version: nextVersion }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
