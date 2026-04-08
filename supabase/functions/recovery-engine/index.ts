import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.0";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.99.0/cors";

const MAX_RETRIES = 3;

const STRATEGIES: Record<string, string[]> = {
  too_complex: ["downgrade_complexity", "split_further", "fallback_version"],
  dependency_missing: ["bypass_temporary", "mock_data", "defer"],
  timeout: ["retry_partial", "reduce_scope", "async_queue"],
  cost_exceeded: ["downgrade_complexity", "fallback_version", "defer"],
  unknown: ["retry_partial", "fallback_version", "split_further"],
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { task_id, failure_type, error_context } = await req.json();
    if (!task_id || !failure_type) return new Response(JSON.stringify({ error: "task_id and failure_type required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Check previous recovery attempts
    const { data: prevRecoveries } = await sb.from("execution_recovery_memory").select("*").eq("task_id", task_id).order("created_at", { ascending: false });
    const retryCount = prevRecoveries?.length || 0;

    if (retryCount >= MAX_RETRIES) {
      // Mark as abandoned
      await sb.from("execution_tasks").update({ current_status: "abandoned" }).eq("id", task_id);
      await sb.from("execution_decisions").insert({
        task_id, decision_type: "abandon", decision_reason: `${MAX_RETRIES} tentatives de recovery échouées`,
        selected_strategy: "abandon", score_snapshot: 0,
      });
      return new Response(JSON.stringify({ action: "abandoned", reason: `Max retries (${MAX_RETRIES}) reached`, retry_count: retryCount }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Find best strategy — avoid previously failed strategies
    const usedStrategies = new Set(prevRecoveries?.filter(r => !r.success).map(r => r.recovery_strategy) || []);
    const candidates = STRATEGIES[failure_type] || STRATEGIES.unknown;
    const strategy = candidates.find(s => !usedStrategies.has(s)) || candidates[0];

    // Check learning for similar failures
    const { data: similarRecoveries } = await sb.from("execution_recovery_memory")
      .select("recovery_strategy, success").eq("failure_type", failure_type).eq("success", true).limit(5);
    const provenStrategy = similarRecoveries?.[0]?.recovery_strategy;
    const finalStrategy = provenStrategy && !usedStrategies.has(provenStrategy) ? provenStrategy : strategy;

    // Save recovery attempt
    await sb.from("execution_recovery_memory").insert({
      task_id, failure_type, recovery_strategy: finalStrategy, success: false, retry_count: retryCount + 1,
      context_json: error_context || {},
    });

    // Update task
    const statusMap: Record<string, string> = {
      retry_partial: "in_progress", downgrade_complexity: "in_progress",
      split_further: "split_into_smaller_tasks", fallback_version: "partial_success",
      bypass_temporary: "in_progress", mock_data: "partial_success",
      defer: "paused_by_budget_rule", reduce_scope: "in_progress", async_queue: "paused_by_budget_rule",
    };
    await sb.from("execution_tasks").update({ current_status: statusMap[finalStrategy] || "in_progress" }).eq("id", task_id);

    // Log decision
    await sb.from("execution_decisions").insert({
      task_id, decision_type: "auto_recovery", decision_reason: `Échec: ${failure_type} → stratégie: ${finalStrategy} (tentative ${retryCount + 1}/${MAX_RETRIES})`,
      selected_strategy: finalStrategy, rule_applied: `recovery_${failure_type}`, score_snapshot: retryCount + 1,
    });

    return new Response(JSON.stringify({
      action: "recovery", strategy: finalStrategy, retry_count: retryCount + 1,
      max_retries: MAX_RETRIES, proven_from_history: finalStrategy === provenStrategy,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
