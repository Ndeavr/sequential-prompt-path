import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.0";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.99.0/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { task_id, score, credits } = await req.json();
    if (!score && !task_id) {
      return new Response(JSON.stringify({ error: "task_id or score required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Resolve score from task if needed
    let taskScore = score;
    let taskCredits = credits;
    if (task_id && !score) {
      const { data: task } = await supabase.from("execution_tasks").select("advanced_score, estimated_credits").eq("id", task_id).single();
      taskScore = task?.advanced_score || task?.estimated_credits || 0;
      taskCredits = task?.estimated_credits || 0;
    }

    // Get active decision rules ordered by min_score
    const { data: rules } = await supabase
      .from("execution_decision_rules")
      .select("*")
      .eq("is_active", true)
      .order("min_score", { ascending: true });

    // Find matching rule
    let matchedRule = null;
    let action = "run";
    let reason = "Score dans les limites acceptables";

    for (const rule of rules || []) {
      if (taskScore >= rule.min_score && taskScore < rule.max_score) {
        matchedRule = rule;
        action = rule.action;
        break;
      }
    }

    // Also check credit limit
    if (matchedRule && taskCredits > matchedRule.max_credit_allowed) {
      action = "pause";
      reason = `Crédits estimés (${taskCredits}) dépassent le maximum autorisé (${matchedRule.max_credit_allowed})`;
    } else if (action === "split") {
      reason = `Score de complexité (${taskScore}) nécessite un découpage`;
    } else if (action === "pause") {
      reason = `Score de complexité (${taskScore}) trop élevé — mise en pause`;
    }

    // Save decision if task_id
    if (task_id) {
      await supabase.from("execution_decisions").insert({
        task_id,
        decision_type: `auto_${action}`,
        decision_reason: reason,
        selected_strategy: action,
        rule_applied: matchedRule?.rule_name || null,
        score_snapshot: taskScore,
      });

      // Update task status
      const statusMap: Record<string, string> = {
        run: "approved",
        split: "split_into_smaller_tasks",
        pause: "paused_by_budget_rule",
      };
      await supabase.from("execution_tasks").update({
        current_status: statusMap[action] || "pending_evaluation",
      }).eq("id", task_id);
    }

    return new Response(JSON.stringify({
      action,
      reason,
      rule_applied: matchedRule?.rule_name || null,
      score: taskScore,
      credits: taskCredits,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
