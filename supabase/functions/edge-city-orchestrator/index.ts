import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const sb = createClient(supabaseUrl, serviceKey);
  const body = await req.json();
  const action = body.action as string;

  try {
    switch (action) {
      // ─── Generate city cluster from service targets ───
      case "generate_cluster": {
        const { city_target_id } = body;
        const { data: services } = await sb.from("agent_city_service_targets")
          .select("*").eq("city_target_id", city_target_id);
        const count = services?.length || 0;

        const { data: cluster } = await sb.from("outbound_city_clusters").insert({
          city_target_id, status: "ready", services_count: count, approved_services_count: count,
        }).select().single();

        return json({ ok: true, cluster, services_count: count });
      }

      // ─── Rank services within a city by priority ───
      case "rank_services": {
        const { city_target_id } = body;
        const { data: services } = await sb.from("agent_city_service_targets")
          .select("*").eq("city_target_id", city_target_id)
          .order("priority_score", { ascending: false });

        if (!services?.length) return json({ ok: false, error: "no_services" });

        for (let i = 0; i < services.length; i++) {
          await sb.from("agent_city_service_targets")
            .update({ execution_rank: i + 1 }).eq("id", services[i].id);
        }

        return json({ ok: true, ranked: services.length });
      }

      // ─── Create execution waves from ranked services ───
      case "create_waves": {
        const { city_cluster_id, city_target_id } = body;
        const { data: services } = await sb.from("agent_city_service_targets")
          .select("*").eq("city_target_id", city_target_id)
          .eq("status", "ready").order("execution_rank", { ascending: true });

        if (!services?.length) return json({ ok: false, error: "no_ready_services" });

        const waves = [];
        for (let i = 0; i < services.length; i++) {
          const svc = services[i];
          const { data: wave } = await sb.from("outbound_city_execution_waves").insert({
            city_cluster_id,
            wave_number: i + 1,
            label: `${svc.service_name} — Vague ${i + 1}`,
            status: "planned",
            daily_send_limit: 50,
          }).select().single();
          waves.push(wave);
        }

        await sb.from("outbound_city_clusters")
          .update({ active_wave_count: waves.length }).eq("id", city_cluster_id);

        return json({ ok: true, waves_created: waves.length, waves });
      }

      // ─── Launch a single wave: create autopilot run + start scraping ───
      case "launch_wave": {
        const { wave_id, city_target_id, city_service_target_id } = body;

        // Create campaign
        const { data: svcTarget } = await sb.from("agent_city_service_targets")
          .select("*").eq("id", city_service_target_id).single();

        const { data: cityTarget } = await sb.from("agent_city_targets")
          .select("*").eq("id", city_target_id).single();

        if (!svcTarget || !cityTarget) return json({ ok: false, error: "target_not_found" });

        const { data: campaign } = await sb.from("outbound_campaigns").insert({
          name: `${svcTarget.service_name} — ${cityTarget.city_name}`,
          status: "scraping",
          city: cityTarget.city_name,
          specialty: svcTarget.specialty_slug,
          target_lead_count: svcTarget.estimated_lead_volume || 50,
          auto_scraping_enabled: true,
          auto_sending_enabled: true,
          daily_send_limit: 50,
          hourly_send_limit: 10,
          agent_target_item_id: null,
        }).select().single();

        // Create autopilot run
        const { data: run } = await sb.from("outbound_autopilot_runs").insert({
          city_target_id,
          city_service_target_id,
          city_execution_wave_id: wave_id,
          campaign_id: campaign?.id,
          status: "running",
          current_stage: "scraping_started",
          last_transition_at: new Date().toISOString(),
          diagnostic_summary: {},
          priority_score: svcTarget.priority_score,
          started_at: new Date().toISOString(),
        }).select().single();

        // Log transition
        await sb.from("outbound_run_stage_transitions").insert({
          run_id: run?.id,
          from_stage: null,
          to_stage: "scraping_started",
          transition_status: "success",
          message: `Scraping started for ${svcTarget.service_name} ${cityTarget.city_name}`,
        });

        // Update wave status
        await sb.from("outbound_city_execution_waves")
          .update({ status: "running", started_at: new Date().toISOString() }).eq("id", wave_id);

        // Create scraping run
        await sb.from("outbound_scraping_runs").insert({
          campaign_id: campaign?.id,
          run_id: run?.id,
          status: "running",
          started_at: new Date().toISOString(),
          raw_entity_count: 0,
          valid_entity_count: 0,
          normalized_entity_count: 0,
          lead_candidate_count: 0,
          error_count: 0,
          logs: {},
        });

        return json({ ok: true, run_id: run?.id, campaign_id: campaign?.id });
      }

      // ─── Advance run to next stage ───
      case "advance_stage": {
        const { run_id, to_stage, message: msg, payload } = body;

        const { data: run } = await sb.from("outbound_autopilot_runs")
          .select("*").eq("id", run_id).single();
        if (!run) return json({ ok: false, error: "run_not_found" });

        const from_stage = run.current_stage;

        // Validate transitions
        const validTransitions: Record<string, string[]> = {
          scraping_started: ["scraping_completed", "failed_scraping"],
          scraping_completed: ["qualification_started", "failed_qualification"],
          qualification_started: ["qualification_completed", "failed_qualification"],
          qualification_completed: ["sending_started", "failed_sending"],
          sending_started: ["sending_completed", "failed_sending"],
          sending_completed: ["completed"],
        };

        const allowed = validTransitions[from_stage] || [];
        if (!allowed.includes(to_stage)) {
          await sb.from("outbound_pipeline_errors").insert({
            run_id, stage: from_stage,
            error_code: "invalid_transition",
            error_message: `Cannot transition from ${from_stage} to ${to_stage}`,
            is_blocking: true,
          });
          return json({ ok: false, error: "invalid_transition", from: from_stage, to: to_stage });
        }

        // Log transition
        await sb.from("outbound_run_stage_transitions").insert({
          run_id, from_stage, to_stage,
          transition_status: to_stage.startsWith("failed") ? "failure" : "success",
          message: msg || `Transition ${from_stage} → ${to_stage}`,
          payload: payload || {},
        });

        const isFailed = to_stage.startsWith("failed");
        const isCompleted = to_stage === "completed";

        await sb.from("outbound_autopilot_runs").update({
          current_stage: to_stage,
          status: isFailed ? "failed" : isCompleted ? "completed" : "running",
          last_transition_at: new Date().toISOString(),
          ...(isCompleted || isFailed ? { finished_at: new Date().toISOString() } : {}),
        }).eq("id", run_id);

        return json({ ok: true, from_stage, to_stage });
      }

      // ─── Fail run with reason ───
      case "fail_run": {
        const { run_id, stage, error_code, error_message: errMsg, is_blocking } = body;

        await sb.from("outbound_pipeline_errors").insert({
          run_id, stage, error_code: error_code || "manual_fail",
          error_message: errMsg || "Manually failed",
          is_blocking: is_blocking ?? true,
        });

        const failStage = `failed_${stage}`;
        await sb.from("outbound_run_stage_transitions").insert({
          run_id, from_stage: stage, to_stage: failStage,
          transition_status: "failure", message: errMsg,
        });

        await sb.from("outbound_autopilot_runs").update({
          current_stage: failStage, status: "failed",
          last_transition_at: new Date().toISOString(),
          finished_at: new Date().toISOString(),
        }).eq("id", run_id);

        return json({ ok: true, stage: failStage });
      }

      // ─── Get diagnostics for a run ───
      case "get_diagnostics": {
        const { run_id } = body;

        const [transitions, errors, scraping, qualification, sending] = await Promise.all([
          sb.from("outbound_run_stage_transitions").select("*").eq("run_id", run_id).order("created_at"),
          sb.from("outbound_pipeline_errors").select("*").eq("run_id", run_id).order("created_at"),
          sb.from("outbound_scraping_runs").select("*").eq("run_id", run_id).maybeSingle(),
          sb.from("outbound_qualification_runs").select("*").eq("run_id", run_id).maybeSingle(),
          sb.from("outbound_sending_runs").select("*").eq("run_id" as any, run_id).maybeSingle(),
        ]);

        return json({
          ok: true,
          transitions: transitions.data || [],
          errors: errors.data || [],
          scraping: scraping.data,
          qualification: qualification.data,
          sending: sending.data,
        });
      }

      default:
        return json({ ok: false, error: "unknown_action" }, 400);
    }
  } catch (e: any) {
    return json({ ok: false, error: e.message }, 500);
  }
});

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
