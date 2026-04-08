import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.0";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.99.0/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { task_id, agent_task_id, action } = await req.json();
    if (!agent_task_id && !task_id) return new Response(JSON.stringify({ error: "agent_task_id or task_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Route specific agent task
    if (agent_task_id && action === "start") {
      await sb.from("execution_agent_tasks").update({ status: "running", started_at: new Date().toISOString() }).eq("id", agent_task_id);
      return new Response(JSON.stringify({ status: "started", agent_task_id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (agent_task_id && action === "complete") {
      await sb.from("execution_agent_tasks").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", agent_task_id);
      
      // Check if all agent tasks for parent are done
      const { data: agentTask } = await sb.from("execution_agent_tasks").select("parent_task_id").eq("id", agent_task_id).single();
      if (agentTask?.parent_task_id) {
        const { data: siblings } = await sb.from("execution_agent_tasks").select("status").eq("parent_task_id", agentTask.parent_task_id);
        const allDone = siblings?.every(s => s.status === "completed");
        if (allDone) {
          await sb.from("execution_tasks").update({ current_status: "completed" }).eq("id", agentTask.parent_task_id);
        }
      }
      return new Response(JSON.stringify({ status: "completed", agent_task_id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (agent_task_id && action === "fail") {
      await sb.from("execution_agent_tasks").update({ status: "failed", completed_at: new Date().toISOString() }).eq("id", agent_task_id);
      return new Response(JSON.stringify({ status: "failed", agent_task_id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Get all pending agent tasks for a parent task
    if (task_id && action === "list") {
      const { data: agents } = await sb.from("execution_agent_tasks").select("*").eq("parent_task_id", task_id).order("created_at");
      return new Response(JSON.stringify({ agents: agents || [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
