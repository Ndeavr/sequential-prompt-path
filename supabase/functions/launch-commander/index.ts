/**
 * launch-commander — runs every minute via pg_cron.
 * Reads launch_mode_state and dispatches to the appropriate agents.
 * Surfaces per-sub-agent blockers as dedicated launch_pipeline_events rows.
 */
import { corsHeaders, adminClient, getLaunchState, logLaunchEvent } from "../_shared/launch.ts";
import { reportOutcome, BlockReason } from "../_shared/reliability.ts";

const FN_URL = (name: string) => `${Deno.env.get("SUPABASE_URL")}/functions/v1/${name}`;
const SRK = () => Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function invoke(name: string, body: Record<string, unknown> = {}, timeoutMs = 20000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(FN_URL(name), {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SRK()}` },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    const txt = await r.text();
    return { ok: r.ok, status: r.status, body: txt };
  } catch (e) {
    const msg = (e as any)?.name === "AbortError" ? `timeout after ${timeoutMs}ms` : String(e);
    return { ok: false, status: 0, body: msg };
  } finally {
    clearTimeout(t);
  }
}


async function surfaceSubAgentBlockers(
  sb: ReturnType<typeof adminClient>,
  results: Record<string, { ok: boolean; status: number; body: string }>,
) {
  for (const [agent, r] of Object.entries(results)) {
    if (r.ok) continue;
    const short = r.body.slice(0, 240);
    const fullAgent = `launch-agent-${agent}`;
    await logLaunchEvent({
      agent: fullAgent,
      event: "blocked",
      success: false,
      message: `HTTP ${r.status}: ${short}`,
    });
    await sb.from("launch_mode_state").update({
      last_blocker_agent: fullAgent,
      last_blocker_reason: short,
      last_blocker_at: new Date().toISOString(),
    }).eq("id", true);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const startedAt = Date.now();
  const state = await getLaunchState();
  const sb = adminClient();

  if (state.mode === "first_customer_acquired") {
    await reportOutcome({
      operation: "launch.commander.tick",
      outcome: "achieved",
      next_action: "Mission accomplie — premier client acquis. Commander en veille.",
    });
    return new Response(JSON.stringify({ status: "first_customer_acquired" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (state.mode !== "launching") {
    await reportOutcome({
      operation: "launch.commander.tick",
      outcome: "blocked",
      block_reason: state.mode === "paused" ? BlockReason.LAUNCH_PAUSED : BlockReason.LAUNCH_IDLE,
      next_action: "Activer le mode lancement via /admin/launch-war-room",
    });
    return new Response(JSON.stringify({ status: state.mode }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // 1) Reap stalled leads first so the operator sees blockers immediately
  try { await sb.rpc("mark_stale_launch_leads"); } catch (_e) { /* non-fatal */ }

  // 2) Count leads per state via aggregate RPC (avoids full table scan)
  const { data: countRows } = await sb.rpc("get_launch_lead_status_counts");
  const byStatus: Record<string, number> = {};
  for (const row of (countRows ?? []) as any[]) byStatus[row.lead_status] = Number(row.count);

  const discoveredQueue = byStatus.DISCOVERED ?? 0;
  const messagedReady = (byStatus.ENRICHED ?? 0) + (byStatus.SCORED ?? 0);

  // 2b) LOOP DEFENSE (incident 2026-08 — Google Places billing loop).
  // Never trigger discovery when the Google circuit/kill switch is open, and never
  // retry discovery more than once per SCOUT_COOLDOWN_MINUTES. The rest of the
  // pipeline keeps running on existing inventory.
  const SCOUT_COOLDOWN_MINUTES = 30;
  let scoutSkipped: string | null = null;
  {
    const { data: circuit } = await sb
      .from("provider_circuit_state").select("state, kill_switch, retry_after, last_error_code")
      .eq("provider", "google_places").maybeSingle();
    const circuitOpen = Boolean(
      circuit?.kill_switch ||
      (circuit?.state === "open" && (!circuit?.retry_after || new Date(circuit.retry_after) > new Date())),
    );
    if (circuitOpen) {
      scoutSkipped = circuit?.kill_switch ? "kill_switch_enabled" : (circuit?.last_error_code ?? "circuit_open");
    } else {
      const since = new Date(Date.now() - SCOUT_COOLDOWN_MINUTES * 60_000).toISOString();
      const { data: recent } = await sb
        .from("places_api_calls").select("id")
        .eq("caller", "launch-agent-scout").gte("created_at", since).limit(1);
      if ((recent ?? []).length > 0) scoutSkipped = "scout_cooldown";
    }
  }

  // Build agent invocations conditionally, then run in parallel with per-agent timeouts
  const jobs: Array<[string, Promise<{ ok: boolean; status: number; body: string }>]> = [];
  if (discoveredQueue < 100 && !scoutSkipped) jobs.push(["scout", invoke("launch-agent-scout", { batch: 25 })]);
  jobs.push(["enrich", invoke("launch-agent-enrich", { batch: 20 })]);
  jobs.push(["visibility", invoke("launch-agent-visibility", { batch: 20 })]);
  if (messagedReady > 0) jobs.push(["outreach", invoke("launch-agent-outreach", { batch: 30 })]);
  jobs.push(["delivery-monitor", invoke("launch-agent-delivery-monitor", {})]);
  jobs.push(["reply-detector", invoke("launch-agent-reply-detector", {})]);
  jobs.push(["sales-closer", invoke("launch-agent-sales-closer", { batch: 10 })]);
  jobs.push(["payment-monitor", invoke("launch-agent-payment-monitor", {})]);

  const settled = await Promise.allSettled(jobs.map(([, p]) => p));
  const results: Record<string, { ok: boolean; status: number; body: string }> = {};
  jobs.forEach(([name], i) => {
    const s = settled[i];
    results[name] = s.status === "fulfilled"
      ? s.value
      : { ok: false, status: 0, body: `rejected: ${String((s as any).reason).slice(0, 200)}` };
  });

  await surfaceSubAgentBlockers(sb, results);


  // 3) Fake-success prevention — HTTP 200 is not movement.
  // A scout answering 200 with inserted=0 or blocked=true counts as NO movement.
  const scoutMoved = (() => {
    const r = results["scout"];
    if (!r?.ok) return false;
    try {
      const parsed = JSON.parse(r.body);
      return Number(parsed?.inserted ?? 0) > 0 && parsed?.blocked !== true;
    } catch { return false; }
  })();
  const anyOk = Object.entries(results).some(([name, r]) => r.ok && (name !== "scout" || scoutMoved));
  const anyMovement = (byStatus.DISCOVERED ?? 0) + (byStatus.ENRICHED ?? 0) + (byStatus.MESSAGED ?? 0) > 0;

  await reportOutcome({
    operation: "launch.commander.tick",
    outcome: anyOk && anyMovement ? "achieved" : "partial",
    payload: { byStatus, durationMs: Date.now() - startedAt, results },
    next_action: anyOk && anyMovement ? undefined : "No actionable work this tick — check Active Blocker.",
  });

  await logLaunchEvent({
    agent: "launch-commander",
    event: "tick",
    success: anyOk && anyMovement,
    payload: { byStatus, results },
  });

  return new Response(JSON.stringify({ ok: true, byStatus, results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
