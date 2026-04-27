/**
 * UNPRO Omega — Task Executor
 * ─────────────────────────────
 * Real "Approve & Run" handler.
 *
 * Body: { task_id: string, mode: "approve" | "execute" | "reject" }
 *
 * What it does:
 *   1. Loads agent_tasks row
 *   2. Marks status (approved / executing / rejected)
 *   3. Logs to automation_action_logs (so it appears in live ticker)
 *   4. Logs to agent_logs (so it appears in agents overnight)
 *   5. Optionally invokes the underlying agent edge function (best-effort)
 *   6. Returns the run_id so the UI can track it
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// agent_key → underlying edge function (best-effort wiring)
const AGENT_FN_MAP: Record<string, string> = {
  growth_agent: "autonomous-growth-engine",
  booking_agent: "create-appointment-from-match",
  trust_agent: "verify-contractor",
  document_agent: "extract-document-entities",
  property_agent: "property-autopilot",
  seo_agent: "seo-generator",
  outbound_agent: "process-outbound-queue",
  alex_followup_agent: "alex-resume-session",
  lead_director: "process-outbound-queue",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json().catch(() => ({}));
    const task_id = body?.task_id as string | undefined;
    const mode = (body?.mode ?? "execute") as "approve" | "execute" | "reject";

    if (!task_id) {
      return new Response(JSON.stringify({ error: "task_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Load task
    const { data: task, error: loadErr } = await sb
      .from("agent_tasks")
      .select("id, task_title, agent_name, agent_key, action_plan, status")
      .eq("id", task_id)
      .single();
    if (loadErr || !task) {
      return new Response(JSON.stringify({ error: loadErr?.message ?? "Task not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Update status
    const newStatus = mode === "reject" ? "rejected" : mode === "approve" ? "approved" : "executing";
    const updates: Record<string, unknown> = {
      status: newStatus,
      reviewed_at: new Date().toISOString(),
    };
    if (mode === "execute") updates.executed_at = new Date().toISOString();

    const { error: updErr } = await sb.from("agent_tasks").update(updates).eq("id", task_id);
    if (updErr) throw updErr;

    if (mode === "reject") {
      return new Response(JSON.stringify({ ok: true, status: newStatus }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Log to automation_action_logs (live ticker)
    const { data: actionLog } = await sb.from("automation_action_logs").insert({
      engine_name: task.agent_name ?? task.agent_key ?? "omega",
      action_type: "task_execution",
      action_label: `Approve & Run: ${task.task_title}`,
      action_message: mode === "approve" ? "Approuvé par le founder" : "Exécution lancée",
      action_status: mode === "execute" ? "running" : "queued",
      metadata_json: { task_id, agent_key: task.agent_key, mode },
    }).select("id").single();

    // 4. Log to agent_logs (agents overnight)
    await sb.from("agent_logs").insert({
      agent_name: task.agent_name ?? task.agent_key ?? "omega",
      log_type: "execution",
      message: `${mode === "approve" ? "Approuvé" : "Lancé"}: ${task.task_title}`,
      metadata: { task_id, action_log_id: actionLog?.id } as any,
    });

    // 5. Best-effort: invoke underlying agent function
    let invocationResult: { ok: boolean; fn?: string; error?: string } = { ok: true };
    if (mode === "execute" && task.agent_key && AGENT_FN_MAP[task.agent_key]) {
      const fn = AGENT_FN_MAP[task.agent_key];
      try {
        const { error: invErr } = await sb.functions.invoke(fn, {
          body: {
            _origin: "omega_command_center",
            task_id,
            action_plan: task.action_plan,
          },
        });
        if (invErr) {
          invocationResult = { ok: false, fn, error: invErr.message };
          // Mark blocker so it appears as a leak
          await sb.from("automation_action_logs").update({
            action_status: "failed",
            action_message: `Échec invocation ${fn}: ${invErr.message}`,
          }).eq("id", actionLog?.id);
        } else {
          invocationResult = { ok: true, fn };
          await sb.from("automation_action_logs").update({
            action_status: "completed",
            action_message: `Exécuté via ${fn}`,
          }).eq("id", actionLog?.id);
        }
      } catch (e) {
        invocationResult = { ok: false, fn, error: e instanceof Error ? e.message : String(e) };
      }
    }

    return new Response(JSON.stringify({
      ok: true,
      task_id,
      status: newStatus,
      action_log_id: actionLog?.id ?? null,
      invocation: invocationResult,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[fn-omega-execute-task]", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
