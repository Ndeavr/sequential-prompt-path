/**
 * launch-commander — runs every minute via pg_cron.
 * Reads launch_mode_state and dispatches to the appropriate agents.
 * Reports per-step outcome via reportOutcome (Rule 10).
 */
import { corsHeaders, adminClient, getLaunchState, logLaunchEvent } from "../_shared/launch.ts";
import { reportOutcome, BlockReason, FailureCode } from "../_shared/reliability.ts";

const FN_URL = (name: string) => `${Deno.env.get("SUPABASE_URL")}/functions/v1/${name}`;
const SRK = () => Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function invoke(name: string, body: Record<string, unknown> = {}) {
  try {
    const r = await fetch(FN_URL(name), {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SRK()}` },
      body: JSON.stringify(body),
    });
    const txt = await r.text();
    return { ok: r.ok, status: r.status, body: txt };
  } catch (e) {
    return { ok: false, status: 0, body: String(e) };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const startedAt = Date.now();
  const state = await getLaunchState();

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

  const sb = adminClient();

  // Count leads per state to drive scout backfill
  const { data: counts } = await sb.from("launch_leads").select("lead_status");
  const byStatus: Record<string, number> = {};
  for (const row of counts ?? []) byStatus[(row as any).lead_status] = (byStatus[(row as any).lead_status] ?? 0) + 1;

  const discoveredQueue = byStatus.DISCOVERED ?? 0;
  const messagedReady = (byStatus.ENRICHED ?? 0) + (byStatus.SCORED ?? 0);

  const results: Record<string, unknown> = {};

  // Scout: keep at least 100 discovered ahead
  if (discoveredQueue < 100) {
    results.scout = await invoke("launch-agent-scout", { batch: 25 });
  }

  // Enrich up to 20/min
  results.enrich = await invoke("launch-agent-enrich", { batch: 20 });

  // Visibility scoring up to 20/min
  results.visibility = await invoke("launch-agent-visibility", { batch: 20 });

  // Outreach up to 30/min
  if (messagedReady > 0) {
    results.outreach = await invoke("launch-agent-outreach", { batch: 30 });
  }

  // Delivery + reply detection
  results.delivery = await invoke("launch-agent-delivery-monitor", {});
  results.replies = await invoke("launch-agent-reply-detector", {});

  // Sales closer: any REPLIED with classification INTERESTED/BOOK_CALL
  results.closer = await invoke("launch-agent-sales-closer", { batch: 10 });

  // Payment monitor scans recent stripe events
  results.payments = await invoke("launch-agent-payment-monitor", {});

  await reportOutcome({
    operation: "launch.commander.tick",
    outcome: "achieved",
    payload: { byStatus, durationMs: Date.now() - startedAt, results },
  });

  await logLaunchEvent({
    agent: "launch-commander",
    event: "tick",
    payload: { byStatus, results },
  });

  return new Response(JSON.stringify({ ok: true, byStatus, results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
