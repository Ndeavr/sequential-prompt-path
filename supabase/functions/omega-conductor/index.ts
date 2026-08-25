// Omega Conductor — daily autonomous loop dispatcher
// Triggered by pg_cron with ?phase=<phase_name>
//
// REPAIR (2026-08-24):
//  - The canonical phase list now matches the cron jobs AND the
//    omega_loop_runs.phase check constraint (12 phases).
//  - Each step declares how its payload is built. Several downstream
//    functions are PER-RECORD (they require an id / url / action) — calling
//    them with an empty body returned 400 and made whole phases "failed".
//    Steps now resolve real candidates from the DB and fan out, or are
//    skipped (not failed) when there is no work.
//  - `dry_run: true` resolves candidates and reports them WITHOUT invoking
//    anything that performs an external send or a paid API call.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type Sb = ReturnType<typeof createClient>;

interface Step {
  fn: string;
  /** Static payload merged into every invocation. */
  payload?: Record<string, unknown>;
  /** Resolve per-record payloads. Empty array => step skipped, never failed. */
  resolve?: (sb: Sb) => Promise<Record<string, unknown>[]>;
  /** Performs an external send or a paid API call — never invoked on dry_run. */
  external?: boolean;
}

const FANOUT_LIMIT = 3;

/** CANONICAL PHASES — keep in sync with omega_loop_runs.phase check constraint. */
const PHASES: Record<string, Step[]> = {
  prospect_discovery: [
    // war-prospecting-engine requires an `action`.
    { fn: "war-prospecting-engine", payload: { action: "discover" }, external: true },
    // sniper-import-targets is a pure ingest endpoint (requires a targets array):
    // it has no autonomous mode, so it is intentionally NOT part of this phase.
  ],
  enrichment: [
    { fn: "enrich-prospect", payload: { mode: "cron_worker" }, external: true },
    {
      fn: "sniper-enrich-target",
      external: true,
      resolve: async (sb) => {
        const { data } = await sb
          .from("sniper_targets")
          .select("id")
          .or("enrichment_status.is.null,enrichment_status.eq.pending")
          .order("created_at", { ascending: true })
          .limit(FANOUT_LIMIT);
        return (data ?? []).map((r: Record<string, unknown>) => ({ targetId: r.id }));
      },
    },
  ],
  scoring: [
    {
      fn: "aipp-real-scan",
      external: true,
      resolve: async (sb) => {
        const { data } = await sb
          .from("outbound_companies")
          .select("website")
          .not("website", "is", null)
          .order("created_at", { ascending: false })
          .limit(FANOUT_LIMIT);
        return (data ?? [])
          .filter((r: Record<string, unknown>) => !!r.website)
          .map((r: Record<string, unknown>) => ({ website_url: r.website }));
      },
    },
    {
      fn: "edge-generate-aipp-preview",
      resolve: async (sb) => {
        const { data } = await sb
          .from("prospect_enrichments")
          .select("prospect_id")
          .order("created_at", { ascending: false })
          .limit(FANOUT_LIMIT);
        return (data ?? []).map((r: Record<string, unknown>) => ({ company_id: r.prospect_id }));
      },
    },
  ],
  campaign_generation: [
    { fn: "campaign-generator", payload: { mode: "auto" } },
    { fn: "sniper-generate-assets", payload: { mode: "auto" } },
  ],
  outreach_send: [
    { fn: "process-outbound-queue", external: true },
    { fn: "sniper-queue-send", external: true },
  ],
  reply_handling: [
    { fn: "edge-classify-reply-intent", payload: { mode: "batch" } },
  ],
  alex_closing: [
    { fn: "alex-autopilot-evaluate", payload: { mode: "batch" } },
    { fn: "alex-reengage-check", payload: { mode: "batch" }, external: true },
  ],
  payment_followup: [
    { fn: "admin-activation-subscribe", payload: { mode: "followup_scan", dry_run: true } },
  ],
  onboarding_activation: [
    {
      // Requires a real paid Stripe session id — never invoke with an empty body.
      fn: "activate-contractor-plan",
      resolve: async (sb) => {
        const { data } = await sb
          .from("billing_checkout_sessions")
          .select("stripe_checkout_session_id")
          .eq("payment_status", "paid")
          .is("paid_at", null)
          .order("created_at", { ascending: false })
          .limit(FANOUT_LIMIT);
        return (data ?? [])
          .filter((r: Record<string, unknown>) => !!r.stripe_checkout_session_id)
          .map((r: Record<string, unknown>) => ({ checkout_session_id: r.stripe_checkout_session_id }));
      },
    },
    {
      // Requires funnel_id — fan out over funnels awaiting enrichment.
      fn: "contractor-activation-enrich",
      resolve: async (sb) => {
        const { data } = await sb
          .from("contractor_activation_funnel")
          .select("id, business_name, phone, website")
          .or("import_status.is.null,import_status.eq.pending,import_status.eq.failed")
          .order("created_at", { ascending: false })
          .limit(FANOUT_LIMIT);
        return (data ?? []).map((r: Record<string, unknown>) => ({
          funnel_id: r.id,
          business_name: r.business_name,
          phone: r.phone,
          website: r.website,
        }));
      },
    },
  ],

  expansion_scan: [
    { fn: "expansion-detector", payload: { mode: "scan" } },
  ],
  churn_rescue: [
    { fn: "churn-detector", payload: { mode: "scan" } },
  ],
  metrics_optimize: [
    { fn: "fn-omega-rollup-metrics" },
    { fn: "sniper-update-heat" },
  ],
};

export const OMEGA_PHASES = Object.keys(PHASES);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const phase = (url.searchParams.get("phase") || (body as Record<string, unknown>).phase) as
    | string
    | undefined;
  const dryRun =
    url.searchParams.get("dry_run") === "true" || (body as Record<string, unknown>).dry_run === true;

  if (phase === "__list__") {
    return new Response(JSON.stringify({ phases: OMEGA_PHASES }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!phase || !PHASES[phase]) {
    return new Response(
      JSON.stringify({ error: "invalid_phase", phase, valid_phases: OMEGA_PHASES }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  // REPAIR: `omega_loop_runs_date_phase_uniq` (loop_date, phase) allows one row
  // per phase per day (except outreach_send). The previous hard INSERT made every
  // re-run of the day fail with a duplicate key error. We now reuse the day's row.
  const today = new Date().toISOString().slice(0, 10);
  const { data: sameDay } = await supabase
    .from("omega_loop_runs")
    .select("id")
    .eq("loop_date", today)
    .eq("phase", phase)
    .maybeSingle();

  let run: { id: string } | null = null;
  let insertErr: { message: string } | null = null;

  if (sameDay?.id && phase !== "outreach_send") {
    const { data, error } = await supabase
      .from("omega_loop_runs")
      .update({ status: "running", started_at: new Date().toISOString(), ended_at: null })
      .eq("id", sameDay.id)
      .select("id")
      .single();
    run = data;
    insertErr = error;
  } else {
    const { data, error } = await supabase
      .from("omega_loop_runs")
      .insert({ phase, status: "running" })
      .select("id")
      .single();
    run = data;
    insertErr = error;
  }

  if (insertErr || !run) {
    console.error("[omega-conductor] run row failed", insertErr);
    return new Response(JSON.stringify({ error: insertErr?.message ?? "run_row_failed", phase }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const stats: Record<string, unknown> = {};
  const errors: { fn: string; error: string }[] = [];
  const steps = PHASES[phase];
  let executed = 0;
  let skipped = 0;

  for (const step of steps) {
    let payloads: Record<string, unknown>[] = [step.payload ?? {}];

    if (step.resolve) {
      try {
        payloads = await step.resolve(supabase);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push({ fn: step.fn, error: `resolve_failed: ${msg}` });
        continue;
      }
      if (payloads.length === 0) {
        stats[step.fn] = { skipped: "no_candidates" };
        skipped++;
        continue;
      }
      payloads = payloads.map((p) => ({ ...(step.payload ?? {}), ...p }));
    }

    // REPAIR: a dry-run must never invoke anything. Downstream functions do not
    // all understand a `dry_run` flag, so invoking them returned non-2xx and made
    // healthy phases look "failed". We now only report resolved candidates.
    if (dryRun) {
      stats[step.fn] = { dry_run: true, candidates: payloads.length, external: !!step.external };
      skipped++;
      continue;
    }

    const results: unknown[] = [];
    let stepFailed = 0;

    for (const payload of payloads) {
      try {
        const { data, error } = await supabase.functions.invoke(step.fn, {
          body: { triggered_by: "omega-conductor", phase, run_id: run.id, dry_run: dryRun, ...payload },
        });
        if (error) {
          stepFailed++;
          errors.push({ fn: step.fn, error: error.message ?? String(error) });
        } else {
          results.push(data?.summary ?? data ?? "ok");
        }
      } catch (e) {
        stepFailed++;
        errors.push({ fn: step.fn, error: e instanceof Error ? e.message : String(e) });
      }
    }

    executed++;
    stats[step.fn] = {
      invocations: payloads.length,
      failed: stepFailed,
      results: results.slice(0, 3),
    };
  }

  const status = executed === 0 && skipped > 0
    ? "skipped"
    : errors.length === 0
    ? "success"
    : errors.length < steps.length
    ? "success"
    : "failed";

  await supabase
    .from("omega_loop_runs")
    .update({ status, ended_at: new Date().toISOString(), stats, errors })
    .eq("id", run.id);

  return new Response(
    JSON.stringify({ run_id: run.id, phase, status, dry_run: dryRun, executed, skipped, stats, errors }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
