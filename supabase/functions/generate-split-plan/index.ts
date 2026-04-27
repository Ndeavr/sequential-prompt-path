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

    let taskScope = scope;
    let taskName = "Tâche";
    if (task_id) {
      const { data: task } = await supabase.from("execution_tasks").select("requested_scope_json, task_name").eq("id", task_id).single();
      taskScope = task?.requested_scope_json || scope || {};
      taskName = task?.task_name || "Tâche";
    }

    // Generate split steps based on scope
    const steps: { step: number; label: string; type: string; estimated_credits: number; priority: string }[] = [];
    let stepNum = 1;

    if ((taskScope?.tables_count || 0) > 0) {
      steps.push({ step: stepNum++, label: `Créer ${taskScope.tables_count} table(s) + RLS`, type: "data", estimated_credits: taskScope.tables_count * 5, priority: "critical" });
    }
    if ((taskScope?.edge_functions || 0) > 0) {
      steps.push({ step: stepNum++, label: `Implémenter ${taskScope.edge_functions} edge function(s)`, type: "backend", estimated_credits: taskScope.edge_functions * 8, priority: "critical" });
    }
    if ((taskScope?.components_count || 0) > 0) {
      steps.push({ step: stepNum++, label: `Créer ${taskScope.components_count} composant(s) UI`, type: "ui", estimated_credits: taskScope.components_count * 3, priority: "high" });
    }
    if ((taskScope?.pages_count || 0) > 0) {
      steps.push({ step: stepNum++, label: `Brancher ${taskScope.pages_count} page(s) + routing`, type: "ui", estimated_credits: taskScope.pages_count * 4, priority: "high" });
    }
    if ((taskScope?.api_calls || 0) > 0) {
      steps.push({ step: stepNum++, label: `Intégrer ${taskScope.api_calls} appel(s) API`, type: "backend", estimated_credits: taskScope.api_calls * 3, priority: "medium" });
    }
    if ((taskScope?.automation_needed || 0) > 0) {
      steps.push({ step: stepNum++, label: `Configurer ${taskScope.automation_needed} automation(s)`, type: "automation", estimated_credits: taskScope.automation_needed * 6, priority: "low" });
    }
    if ((taskScope?.image_generation || 0) > 0) {
      steps.push({ step: stepNum++, label: `Générer ${taskScope.image_generation} asset(s) visuels`, type: "polish", estimated_credits: taskScope.image_generation * 2, priority: "low" });
    }

    if (steps.length === 0) {
      steps.push({ step: 1, label: `${taskName} — exécution complète`, type: "full", estimated_credits: 10, priority: "critical" });
    }

    // Save split plan if task_id
    if (task_id) {
      // Get latest version
      const { data: existing } = await supabase
        .from("execution_split_plans")
        .select("split_version")
        .eq("task_id", task_id)
        .order("split_version", { ascending: false })
        .limit(1);

      const nextVersion = (existing?.[0]?.split_version || 0) + 1;

      await supabase.from("execution_split_plans").insert({
        task_id,
        split_version: nextVersion,
        split_steps_json: steps,
        current_step_index: 0,
        split_status: "pending_evaluation",
      });
    }

    return new Response(JSON.stringify({
      steps,
      total_estimated_credits: steps.reduce((s, st) => s + st.estimated_credits, 0),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
