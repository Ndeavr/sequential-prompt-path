// UNPRO — Critical Path Live Test
// Orchestrates an end-to-end live test of the acquisition funnel for ONE prospect.
// Actions:
//   - start: { tester_phone, tester_email, tester_business_name } → creates run + sends SMS #1
//   - advance: { run_id, stage, status, error? } → manual checkpoint update
//   - get: { run_id } → returns full run
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const STAGES = [
  "prospect_found",
  "messages_sent",
  "link_clicked",
  "alex_started",
  "analysis_complete",
  "payment_ok",
  "reward_visible",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  const auth = req.headers.get("authorization");
  let userId: string | null = null;
  if (auth) {
    try {
      const token = auth.replace("Bearer ", "");
      const { data } = await supabase.auth.getUser(token);
      userId = data.user?.id ?? null;
    } catch { /* anon */ }
  }

  let body: any = {};
  try { body = await req.json(); } catch { /* empty */ }
  const action = body.action || "get";

  // ─── START ──────────────────────────────────────────────
  if (action === "start") {
    const { tester_phone, tester_email, tester_business_name } = body;
    if (!tester_phone || !tester_email) {
      return new Response(JSON.stringify({ error: "tester_phone and tester_email required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date().toISOString();
    const { data: run, error } = await supabase
      .from("critical_path_test_runs")
      .insert({
        created_by: userId,
        tester_phone, tester_email,
        tester_business_name: tester_business_name || "Test Entrepreneur",
        current_stage: "prospect_found",
        final_status: "running",
        stage_timestamps: { prospect_found: now },
        stage_status: { prospect_found: "ok" },
      })
      .select()
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Trigger SMS Curiosité #1 (best-effort, log into errors[] if it fails)
    let smsResult: any = { skipped: true };
    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/sms-curiosity-enroll`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SERVICE_KEY}`,
        },
        body: JSON.stringify({
          dry_run: false,
          phone: tester_phone,
          meta: { critical_path_test_run_id: run.id, test_mode: true },
        }),
      });
      smsResult = { status: resp.status, body: await resp.text() };
    } catch (e: any) {
      smsResult = { error: e?.message || String(e) };
    }

    const sentNow = new Date().toISOString();
    const errors = smsResult.error || smsResult.status >= 400 ? [{ stage: "messages_sent", detail: smsResult }] : [];
    await supabase
      .from("critical_path_test_runs")
      .update({
        current_stage: "messages_sent",
        stage_timestamps: { ...run.stage_timestamps, messages_sent: sentNow },
        stage_status: { ...run.stage_status, messages_sent: errors.length ? "error" : "ok" },
        errors,
        meta: { sms_invoke: smsResult },
      })
      .eq("id", run.id);

    const { data: updated } = await supabase
      .from("critical_path_test_runs").select("*").eq("id", run.id).single();
    return new Response(JSON.stringify({ run: updated }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ─── ADVANCE ────────────────────────────────────────────
  if (action === "advance") {
    const { run_id, stage, status, error: stageError } = body;
    if (!run_id || !stage) {
      return new Response(JSON.stringify({ error: "run_id and stage required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: run, error } = await supabase
      .from("critical_path_test_runs").select("*").eq("id", run_id).single();
    if (error || !run) {
      return new Response(JSON.stringify({ error: "run not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const now = new Date().toISOString();
    const newTs = { ...run.stage_timestamps, [stage]: now };
    const newStatus = { ...run.stage_status, [stage]: status || "ok" };
    const newErrors = stageError
      ? [...(run.errors || []), { stage, detail: stageError, at: now }]
      : run.errors;

    const isFinal = stage === "reward_visible";
    const update: any = {
      current_stage: stage,
      stage_timestamps: newTs,
      stage_status: newStatus,
      errors: newErrors,
    };
    if (isFinal) {
      update.final_status = (status || "ok") === "ok" ? "completed" : "failed";
      update.completed_at = now;
    }
    if (status === "error") {
      update.final_status = "failed";
    }
    await supabase.from("critical_path_test_runs").update(update).eq("id", run_id);

    const { data: updated } = await supabase
      .from("critical_path_test_runs").select("*").eq("id", run_id).single();
    return new Response(JSON.stringify({ run: updated }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ─── GET ────────────────────────────────────────────────
  if (action === "get") {
    const { run_id } = body;
    if (!run_id) {
      const { data } = await supabase
        .from("critical_path_test_runs")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(20);
      return new Response(JSON.stringify({ runs: data || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data } = await supabase
      .from("critical_path_test_runs").select("*").eq("id", run_id).single();
    return new Response(JSON.stringify({ run: data, stages: STAGES }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ error: "unknown action" }), {
    status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
