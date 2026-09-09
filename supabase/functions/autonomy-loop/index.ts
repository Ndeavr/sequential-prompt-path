/**
 * UNPRO — Autonomy Loop
 * OBSERVE → MEASURE → DIAGNOSE → PROPOSE/ACT → TEST → LEARN → IMPROVE → REPEAT
 *
 * Calls EXISTING workers. Creates no parallel system.
 * Failure isolation: one failing step never aborts the cycle.
 * Never calls an external provider directly — providers stay behind their own
 * fail-closed gates inside the workers it invokes.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { reportOutcome, FailureCode } from "../_shared/reliability.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

/** Ordered pipeline of existing functions. `optional` steps never fail a cycle. */
const STEPS: Array<{ phase: string; fn: string; body?: Record<string, unknown> }> = [
  { phase: "observe", fn: "provider-health-check" },
  { phase: "measure", fn: "fn-detect-automation-blockers" },
  { phase: "diagnose", fn: "outreach-repair-agent" },
  { phase: "act", fn: "acquisition-queue-worker" },
  { phase: "act", fn: "auto-repair-tick" },
  { phase: "learn", fn: "learning-loop" },
  { phase: "improve", fn: "growth-optimizer" },
];

/** Per-cycle budget: hard ceiling on invoked steps and wall time. */
const MAX_STEPS = 12;
const STEP_TIMEOUT_MS = 60_000;
const MAX_CONSECUTIVE_FAILURES = 3;

async function invoke(fn: string, body: Record<string, unknown>) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), STEP_TIMEOUT_MS);
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/${fn}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    const text = await res.text();
    return { ok: res.ok, status: res.status, body: text.slice(0, 2000) };
  } finally {
    clearTimeout(t);
  }
}

async function openBlocker(sb: any, fn: string, message: string) {
  try {
    await sb.from("automation_blockers").insert({
      blocker_key: `autonomy-loop:${fn}`,
      engine_name: "autonomy-loop",
      severity_level: "high",
      blocker_type: "step_failure",
      blocker_title: `Étape autonome en échec: ${fn}`,
      blocker_message: message.slice(0, 1000),
      suggested_resolution: `Inspecter la fonction ${fn} puis relancer la boucle.`,
      retry_possible: true,
      fallback_available: false,
      status: "open",
    });
  } catch (_) { /* diagnostics must never throw */ }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const startedAt = new Date().toISOString();
  const results: Array<Record<string, unknown>> = [];
  let consecutiveFailures = 0;
  let circuitOpen = false;

  let dryRun = false;
  try {
    const parsed = await req.json();
    dryRun = parsed?.dry_run === true;
  } catch (_) { /* cron sends no body */ }

  for (const step of STEPS.slice(0, MAX_STEPS)) {
    if (circuitOpen) {
      results.push({ ...step, skipped: true, reason: "circuit_open" });
      continue;
    }
    if (dryRun) {
      results.push({ ...step, skipped: true, reason: "dry_run" });
      continue;
    }

    try {
      const r = await invoke(step.fn, { source: "autonomy-loop", ...(step.body ?? {}) });
      results.push({ phase: step.phase, fn: step.fn, ok: r.ok, status: r.status });
      if (r.ok) {
        consecutiveFailures = 0;
      } else {
        consecutiveFailures++;
        await openBlocker(sb, step.fn, `HTTP ${r.status}: ${r.body}`);
        await reportOutcome({
          operation: `autonomy.step.${step.fn}`,
          intent: `Exécuter l'étape autonome ${step.phase}`,
          outcome: "failed",
          failure_code: FailureCode.UNKNOWN,
          service: "edge",
          next_action: "Réparation automatique au prochain cycle; blocage ouvert si persistant.",
          payload: { status: r.status },
        });
      }
    } catch (e) {
      consecutiveFailures++;
      const msg = e instanceof Error ? e.message : String(e);
      results.push({ phase: step.phase, fn: step.fn, ok: false, error: msg });
      await openBlocker(sb, step.fn, msg);
    }

    if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
      circuitOpen = true;
      await openBlocker(
        sb,
        "cycle",
        `${MAX_CONSECUTIVE_FAILURES} échecs consécutifs — cycle interrompu pour éviter une boucle.`,
      );
    }
  }

  const okCount = results.filter((r) => r.ok === true).length;

  // Cycle summary is a real observation, never a fabricated success.
  await reportOutcome({
    operation: "autonomy.cycle",
    intent: "Cycle autonome OBSERVE→…→IMPROVE",
    outcome: circuitOpen ? "partial" : okCount > 0 ? "achieved" : "pending",
    service: "autonomy-loop",
    next_action: circuitOpen ? "Résoudre les blocages ouverts" : "Prochain cycle planifié",
    payload: { started_at: startedAt, steps: results },
  });

  try {
    await sb.from("agent_logs").insert({
      agent_name: "autonomy-loop",
      log_type: circuitOpen ? "warning" : "info",
      message: `Cycle autonome: ${okCount}/${results.length} étapes réussies`,
      metadata: { steps: results },
    });
  } catch (_) { /* logging is best-effort */ }

  return new Response(
    JSON.stringify({ ok: true, dry_run: dryRun, circuit_open: circuitOpen, steps: results }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
