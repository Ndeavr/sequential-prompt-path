import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.0";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.99.0/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { task_id, scope } = await req.json();
    if (!task_id && !scope) {
      return new Response(JSON.stringify({ error: "task_id or scope required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get active complexity factors
    const { data: factors } = await supabase
      .from("execution_complexity_factors")
      .select("*")
      .eq("is_active", true);

    // Build scope from task or from input
    let taskScope = scope;
    if (task_id && !scope) {
      const { data: task } = await supabase.from("execution_tasks").select("requested_scope_json").eq("id", task_id).single();
      taskScope = task?.requested_scope_json || {};
    }

    // Calculate weighted score
    let totalScore = 0;
    let totalWeight = 0;
    const breakdown: Record<string, { count: number; weight: number; contribution: number }> = {};

    for (const f of factors || []) {
      const count = Number(taskScope?.[f.factor_key] || 0);
      const weight = Number(f.weight);
      const contribution = count * weight;
      totalScore += contribution;
      totalWeight += weight;
      breakdown[f.factor_key] = { count, weight, contribution };
    }

    const advancedScore = Math.round(totalScore * 100) / 100;

    // Estimate credits: base 5 + score * 1.5
    const estimatedCredits = Math.round(5 + advancedScore * 1.5);

    // Update task if task_id provided
    if (task_id) {
      await supabase.from("execution_tasks").update({
        advanced_score: advancedScore,
        breakdown_json: breakdown,
        estimated_credits: estimatedCredits,
        estimated_complexity_score: advancedScore,
        estimated_credit_cost: estimatedCredits,
      }).eq("id", task_id);
    }

    return new Response(JSON.stringify({
      advanced_score: advancedScore,
      estimated_credits: estimatedCredits,
      breakdown,
      total_weight: totalWeight,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
