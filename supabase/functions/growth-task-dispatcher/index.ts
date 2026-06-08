// UNPRO — Growth Task Dispatcher (cron */5min)
// Claims queued growth_tasks and routes to the right agent.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { reportOutcome, FailureCode } from "../_shared/reliability.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function callAgent(slug: string, payload: Record<string, unknown>) {
  const resp = await fetch(`${SUPABASE_URL}/functions/v1/${slug}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const text = await resp.text();
  return { ok: resp.ok, status: resp.status, body: text };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const sb = createClient(SUPABASE_URL, SERVICE_KEY);

  // Claim up to 5 queued tasks
  const { data: tasks, error } = await sb
    .from("growth_tasks")
    .select("id, type, payload, attempts")
    .eq("status", "queued")
    .order("priority", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(5);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const processed: Array<Record<string, unknown>> = [];

  for (const t of tasks ?? []) {
    await sb.from("growth_tasks")
      .update({ status: "running", started_at: new Date().toISOString(), attempts: (t.attempts ?? 0) + 1 })
      .eq("id", t.id);

    try {
      let result: { ok: boolean; status: number; body: string };
      if (t.type === "expansion") {
        result = await callAgent("growth-expansion-agent", t.payload as Record<string, unknown>);
      } else {
        await sb.from("growth_tasks").update({
          status: "failed", last_error: `unknown_type:${t.type}`, completed_at: new Date().toISOString(),
        }).eq("id", t.id);
        processed.push({ id: t.id, type: t.type, ok: false, reason: "unknown_type" });
        continue;
      }

      if (result.ok) {
        await sb.from("growth_tasks").update({
          status: "activated", completed_at: new Date().toISOString(),
        }).eq("id", t.id);
      } else {
        await sb.from("growth_tasks").update({
          status: "failed",
          last_error: `agent_status_${result.status}: ${result.body.slice(0, 300)}`,
          completed_at: new Date().toISOString(),
        }).eq("id", t.id);
      }
      processed.push({ id: t.id, type: t.type, ok: result.ok });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await sb.from("growth_tasks").update({
        status: "failed", last_error: msg, completed_at: new Date().toISOString(),
      }).eq("id", t.id);
      await reportOutcome({
        operation: "growth_dispatcher", outcome: "failed",
        failure_code: FailureCode.UNKNOWN, affected_record: t.id, payload: { error: msg },
      });
      processed.push({ id: t.id, type: t.type, ok: false, error: msg });
    }
  }

  return new Response(JSON.stringify({ ok: true, processed }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
