import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const FUNCTION_NAME = "daily-acquisition-audit";

function jsonResponse(body: Record<string, unknown>, status = 200) {
  const requestId = crypto.randomUUID();
  return new Response(JSON.stringify({ function: FUNCTION_NAME, request_id: requestId, ...body }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "x-request-id": requestId },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return jsonResponse({ ok: false, message: "Backend credentials missing" }, 500);

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
  const today = new Date().toISOString().slice(0, 10);

  try {
    const { data: sourceHealth } = await supabase.from("v_acquisition_source_health").select("*");
    const { data: funnel } = await supabase.from("v_acquisition_diagnostics_funnel").select("*").order("sort_order");
    const { data: deadQueue } = await supabase.from("v_acquisition_dead_queue").select("*").limit(100);
    const { data: firstDollar } = await supabase.from("v_first_dollar_tracker").select("*").maybeSingle();

    const rootCauses: Array<Record<string, unknown>> = [];
    const recoveryActions: Array<Record<string, unknown>> = [];

    for (const source of sourceHealth ?? []) {
      if (source.is_down || source.status === "scraper_down") {
        rootCauses.push({ code: "source_down", source: source.source, message: source.last_error_message ?? "Source inactive" });
        recoveryActions.push({ action: "run_fallback_acquisition", source: source.source });
      }
    }

    for (const row of funnel ?? []) {
      if (row.sort_order > 1 && Number(row.previous_count ?? 0) > 0 && Number(row.count ?? 0) === 0) {
        rootCauses.push({ code: "funnel_drop_to_zero", step: row.step_key, label: row.label });
        recoveryActions.push({ action: "repair_step", step: row.step_key });
      }
    }

    if ((deadQueue ?? []).length > 0) {
      rootCauses.push({ code: "outreach_blocked", count: (deadQueue ?? []).length });
      recoveryActions.push({ action: "repair_dead_queue", count: (deadQueue ?? []).length });
    }

    if (firstDollar?.next_missing_milestone && firstDollar.next_missing_milestone !== "Scale") {
      rootCauses.push({ code: "first_dollar_incomplete", milestone: firstDollar.next_missing_milestone });
      recoveryActions.push({ action: "advance_first_dollar", milestone: firstDollar.next_missing_milestone });
    }

    let healthScore = 100;
    healthScore -= Math.min(50, (sourceHealth ?? []).filter((s: any) => s.is_down).length * 10);
    healthScore -= Math.min(25, (deadQueue ?? []).length * 5);
    if (firstDollar?.next_missing_milestone !== "Scale") healthScore -= 15;
    healthScore = Math.max(0, healthScore);
    const status = healthScore >= 90 ? "healthy" : healthScore >= 65 ? "warning" : "critical";

    const metrics = { source_health: sourceHealth ?? [], funnel: funnel ?? [], dead_queue_count: (deadQueue ?? []).length, first_dollar: firstDollar };
    const { data: audit, error } = await supabase.from("acquisition_daily_audits").upsert({
      audit_date: today,
      status,
      health_score: healthScore,
      root_causes: rootCauses,
      recovery_actions: recoveryActions,
      metrics,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "audit_date" }).select("*").maybeSingle();
    if (error) throw error;

    return jsonResponse({ ok: true, audit });
  } catch (e) {
    await supabase.from("acquisition_daily_audits").upsert({
      audit_date: today,
      status: "failed",
      health_score: 0,
      error: e instanceof Error ? e.message : String(e),
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "audit_date" });
    return jsonResponse({ ok: false, message: e instanceof Error ? e.message : String(e) }, 500);
  }
});