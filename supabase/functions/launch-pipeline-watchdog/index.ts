/**
 * launch-pipeline-watchdog — every 15 min via pg_cron.
 *
 * Scans the funnel for stalls and emits actionable launch_funnel_alerts with
 * SPECIFIC messages (never generic). Updates launch_mode_state.last_blocker_*
 * with the dominant blocker so the war room banner always points at the real
 * problem.
 */
import { corsHeaders, adminClient, logLaunchEvent } from "../_shared/launch.ts";
import { reportOutcome } from "../_shared/reliability.ts";

interface Stall {
  stage: string;
  agent: string | null;
  severity: "info" | "warning" | "critical";
  reason: string;
  metric_count: number | null;
  payload: Record<string, unknown>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const sb = adminClient();
  const stalls: Stall[] = [];

  // --- 1. Scout: 0 contactable rows in pool ---
  const { data: poolStats } = await sb
    .from("outbound_companies")
    .select("phone, email, city");
  const total = poolStats?.length ?? 0;
  const contactable = (poolStats ?? []).filter((r: any) => r.phone || r.email).length;
  if (total > 0 && contactable === 0) {
    stalls.push({
      stage: "DISCOVERED",
      agent: "launch-agent-enrich-contact",
      severity: "critical",
      reason: `Pool de ${total} entreprises mais 0 contactable (aucun téléphone ni courriel). Lancer launch-agent-enrich-contact.`,
      metric_count: total,
      payload: { total, contactable },
    });
  }

  // --- 2. Scout: 0 DISCOVERED leads in last 6h despite commander ticks ---
  const { data: recentDiscover } = await sb
    .from("launch_pipeline_events")
    .select("id")
    .eq("agent", "launch-agent-scout")
    .eq("event", "discovered_batch")
    .gt("created_at", new Date(Date.now() - 6 * 3600_000).toISOString());
  const { data: recentScoutRuns } = await sb
    .from("launch_pipeline_events")
    .select("id, message")
    .eq("agent", "launch-agent-scout")
    .gt("created_at", new Date(Date.now() - 6 * 3600_000).toISOString())
    .order("created_at", { ascending: false })
    .limit(1);
  if ((recentDiscover?.length ?? 0) === 0 && (recentScoutRuns?.length ?? 0) > 0) {
    stalls.push({
      stage: "DISCOVERED",
      agent: "launch-agent-scout",
      severity: "critical",
      reason: `Le scout a tourné ${recentScoutRuns!.length}+ fois en 6h sans découvrir 1 lead. Dernier message: ${recentScoutRuns![0].message?.slice(0, 200) ?? "(vide)"}.`,
      metric_count: 0,
      payload: { last_message: recentScoutRuns![0].message },
    });
  }

  // --- 3. Outreach: messages générés mais aucun envoi 2xx ---
  const { data: outreachAttempts } = await sb
    .from("launch_pipeline_events")
    .select("success, payload")
    .eq("agent", "launch-agent-outreach")
    .gt("created_at", new Date(Date.now() - 2 * 3600_000).toISOString());
  const attempts = outreachAttempts?.length ?? 0;
  const successes = (outreachAttempts ?? []).filter((r: any) => r.success).length;
  if (attempts >= 5 && successes === 0) {
    stalls.push({
      stage: "MESSAGED",
      agent: "launch-agent-outreach",
      severity: "critical",
      reason: `Outreach a tenté ${attempts} envois en 2h, ${attempts}/${attempts} rejetés par le provider. Vérifier Twilio/Resend.`,
      metric_count: attempts,
      payload: { attempts, successes },
    });
  }

  // --- 4. Checkouts started but no webhooks received ---
  const { data: checkoutLeads } = await sb
    .from("launch_leads")
    .select("id, stripe_session_id, current_stage_started_at")
    .eq("lead_status", "CHECKOUT_SENT");
  const stuckCheckouts = (checkoutLeads ?? []).filter((l: any) =>
    l.stripe_session_id && l.current_stage_started_at &&
    Date.now() - new Date(l.current_stage_started_at).getTime() > 2 * 3600_000
  );
  if (stuckCheckouts.length > 0) {
    stalls.push({
      stage: "CHECKOUT_SENT",
      agent: "stripe-webhook",
      severity: "warning",
      reason: `${stuckCheckouts.length} checkout(s) Stripe créés mais aucun webhook reçu après 2h. Vérifier l'endpoint stripe-webhook.`,
      metric_count: stuckCheckouts.length,
      payload: { stuck_lead_ids: stuckCheckouts.map((l: any) => l.id).slice(0, 5) },
    });
  }

  // --- 5. Zero activations today + launching mode active ---
  const { data: state } = await sb.from("launch_mode_state").select("*").eq("id", true).maybeSingle();
  if (state?.mode === "launching") {
    const { count: activationsToday } = await sb
      .from("launch_leads")
      .select("id", { count: "exact", head: true })
      .gte("activated_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString());
    if ((activationsToday ?? 0) === 0) {
      // only escalate to warning if no activations in 24h either
      const { count: activations24h } = await sb
        .from("launch_leads")
        .select("id", { count: "exact", head: true })
        .gte("activated_at", new Date(Date.now() - 24 * 3600_000).toISOString());
      if ((activations24h ?? 0) === 0) {
        stalls.push({
          stage: "ACTIVATED",
          agent: "launch-commander",
          severity: "critical",
          reason: "Aucune activation en 24h alors que le mode lancement est actif. Investiguer le pipeline complet.",
          metric_count: 0,
          payload: { mode: state.mode },
        });
      }
    }
  }

  // --- Persist + alert ---
  if (stalls.length > 0) {
    await sb.from("launch_funnel_alerts").insert(stalls.map((s) => ({
      stage: s.stage, agent: s.agent, severity: s.severity,
      reason: s.reason, metric_count: s.metric_count, payload: s.payload,
    })));
    const top = stalls.sort((a, b) => (a.severity === "critical" ? -1 : 1) - (b.severity === "critical" ? -1 : 1))[0];
    await sb.from("launch_mode_state").update({
      last_blocker_agent: top.agent,
      last_blocker_reason: top.reason,
      last_blocker_at: new Date().toISOString(),
    }).eq("id", true);
  }

  await logLaunchEvent({
    agent: "launch-pipeline-watchdog",
    event: "scan",
    success: stalls.length === 0,
    message: stalls.length === 0
      ? "Aucun blocage détecté sur le pipeline"
      : `${stalls.length} blocage(s) détecté(s)`,
    payload: { stalls },
  });

  await reportOutcome({
    operation: "launch.watchdog.scan",
    outcome: stalls.length === 0 ? "achieved" : "partial",
    payload: { stall_count: stalls.length, stages: stalls.map(s => s.stage) },
    next_action: stalls.length > 0 ? stalls[0].reason : undefined,
  });

  return new Response(JSON.stringify({ ok: true, stalls }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
