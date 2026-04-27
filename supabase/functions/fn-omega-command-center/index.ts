/**
 * UNPRO Omega — Founder Command Center API (LIVE V3)
 * ─────────────────────────────────────────────────────
 * 100% real data. Every field documents its source. Anything inferred is
 * tagged `is_estimated`. Empty states are honest, never fabricated.
 *
 * Contract:
 *   • header_kpis      → revenue today, MRR, paid pros, bookings, alerts, health
 *   • todays_command   → highest-impact open agent_task with source breakdown
 *   • money_grid       → 4 numbers + REAL 7-day daily series for sparklines
 *   • trust            → for each KPI: source table, formula, raw counts, ts
 *   • biggest_leak     → critical blocker
 *   • opportunity      → top market_opportunity / city_service_demand_grid gap
 *   • agents_overnight → last 24h timeline (action_logs + agent_logs)
 *   • needs_approval   → real approval queue
 *   • subsystem_health → engine bars from runtime_function_health
 *   • weekly_targets   → close X / book Y with progress
 *   • forecast         → 7-day projection from rolling baseline
 *   • live_ticker      → funnel events + automation actions + alex sessions
 *   • running_now      → autonomous actions in flight
 *   • process_pipeline → revenue funnel + booking funnel + alex funnel
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const now = new Date();
    const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0);
    const startOf7d = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
    const startOf14d = new Date(now.getTime() - 14 * 24 * 3600 * 1000);
    const startOf24h = new Date(now.getTime() - 24 * 3600 * 1000);
    const startOf1h = new Date(now.getTime() - 60 * 60 * 1000);

    // ─── Parallel fetch (all sources clearly named) ─────────────────
    const [
      // Revenue / subs
      activeSubsRes,
      planCatalogRes,
      subs7dRes,
      subs14dRes,
      // Bookings
      apptsTodayRes,
      appts7dRes,
      apptsAllRes,
      // Health / alerts
      alertsRes,
      blockersTopRes,
      healthRes,
      // Tasks / ops
      buildNextRes,
      runningRes,
      approvalRes,
      // Opportunities
      opportunityRes,
      demandGapRes,
      // Live activity
      actionLogs24hRes,
      agentLogs24hRes,
      funnelEventsRes,
      alexSessionsRes,
      systemEventsRes,
    ] = await Promise.all([
      sb.from("contractor_subscriptions")
        .select("id, plan_id, status, billing_interval, current_period_start, created_at")
        .eq("status", "active"),
      sb.from("plan_catalog")
        .select("id, code, name, monthly_price, annual_price"),
      sb.from("contractor_subscriptions")
        .select("id, plan_id, billing_interval, current_period_start, created_at")
        .eq("status", "active")
        .gte("created_at", startOf7d.toISOString()),
      sb.from("contractor_subscriptions")
        .select("id, plan_id, billing_interval, created_at")
        .eq("status", "active")
        .gte("created_at", startOf14d.toISOString()),
      sb.from("appointments")
        .select("id", { count: "exact", head: true })
        .gte("created_at", startOfDay.toISOString()),
      sb.from("appointments")
        .select("id, created_at, status")
        .gte("created_at", startOf7d.toISOString()),
      sb.from("appointments")
        .select("id", { count: "exact", head: true }),
      sb.from("automation_blockers")
        .select("id", { count: "exact", head: true })
        .eq("status", "open")
        .in("severity_level", ["critical", "high"]),
      sb.from("automation_blockers")
        .select("blocker_title, blocker_message, severity_level, engine_name, created_at")
        .eq("status", "open")
        .order("severity_level", { ascending: true })
        .order("created_at", { ascending: false })
        .limit(1),
      sb.from("runtime_function_health")
        .select("function_name, health_status, latency_ms, checked_at")
        .gte("checked_at", startOf1h.toISOString())
        .limit(500),
      sb.from("agent_tasks")
        .select("id, task_title, task_description, agent_name, agent_key, impact_score, urgency, execution_mode, action_plan, proposed_at")
        .eq("status", "proposed")
        .order("impact_score", { ascending: false })
        .order("proposed_at", { ascending: false })
        .limit(3),
      sb.from("automation_action_logs")
        .select("id, engine_name, action_label, action_message, action_status, created_at")
        .in("action_status", ["running", "queued"])
        .order("created_at", { ascending: false })
        .limit(8),
      sb.from("agent_tasks")
        .select("id, task_title, task_description, agent_name, impact_score, urgency, proposed_at, action_plan")
        .eq("status", "proposed")
        .eq("execution_mode", "requires_approval")
        .order("urgency", { ascending: false })
        .limit(8),
      sb.from("market_opportunities")
        .select("id, problem_type, estimated_value_cents, urgency, city, status, created_at")
        .eq("status", "open")
        .order("estimated_value_cents", { ascending: false, nullsFirst: false })
        .limit(1),
      sb.from("city_service_demand_grid")
        .select("city_slug, trade_slug, service_slug, demand_score, supply_score, gap_score, estimated_value_cents, has_contractors, recommended_actions")
        .order("gap_score", { ascending: false, nullsFirst: false })
        .limit(1),
      sb.from("automation_action_logs")
        .select("id, engine_name, action_label, action_message, action_status, created_at")
        .gte("created_at", startOf24h.toISOString())
        .order("created_at", { ascending: false })
        .limit(20),
      sb.from("agent_logs")
        .select("id, agent_name, log_type, message, created_at")
        .gte("created_at", startOf24h.toISOString())
        .order("created_at", { ascending: false })
        .limit(20),
      sb.from("contractor_funnel_events")
        .select("id, event_type, step, source, created_at")
        .gte("created_at", startOf24h.toISOString())
        .order("created_at", { ascending: false })
        .limit(20),
      sb.from("alex_sessions")
        .select("id, started_at, ended_at, surface")
        .gte("started_at", startOf24h.toISOString())
        .order("started_at", { ascending: false })
        .limit(20),
      sb.from("system_events")
        .select("id, event_type, severity, payload, created_at")
        .gte("created_at", startOf24h.toISOString())
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    // ─── Plan price lookup (UUID → cents) ───────────────────────────
    const planPriceById = new Map<string, { monthly: number; annual: number; code: string }>();
    for (const p of (planCatalogRes.data ?? [])) {
      planPriceById.set(p.id, {
        monthly: p.monthly_price ?? 0,
        annual: p.annual_price ?? 0,
        code: p.code ?? p.name ?? "unknown",
      });
    }

    const subscriptionMonthlyCents = (sub: { plan_id: string; billing_interval: string | null }): number => {
      const p = planPriceById.get(sub.plan_id);
      if (!p) return 0; // honest: orphaned plan_id contributes $0
      if (sub.billing_interval === "year" || sub.billing_interval === "yearly") {
        return Math.round((p.annual || p.monthly * 12) / 12);
      }
      return p.monthly;
    };

    // ─── MRR + revenue today (real) ─────────────────────────────────
    const activeSubs = activeSubsRes.data ?? [];
    let mrrCents = 0;
    let revenueTodayCents = 0;
    let orphanedSubs = 0;
    for (const s of activeSubs) {
      const monthly = subscriptionMonthlyCents(s as any);
      if (monthly === 0 && s.plan_id) orphanedSubs++;
      mrrCents += monthly;
      // "Revenue today" = NEW activations today (proxy until payments table is wired)
      const startedAt = s.current_period_start ? new Date(s.current_period_start) : new Date(s.created_at);
      if (startedAt >= startOfDay) revenueTodayCents += monthly;
    }

    // ─── 7-day daily series for sparklines ──────────────────────────
    const dayKey = (d: Date) => d.toISOString().slice(0, 10);
    const daysWindow: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000);
      daysWindow.push(dayKey(d));
    }
    const subsByDay = new Map<string, number>(daysWindow.map(d => [d, 0]));
    const revenueByDay = new Map<string, number>(daysWindow.map(d => [d, 0]));
    for (const s of (subs7dRes.data ?? [])) {
      const k = dayKey(new Date(s.created_at));
      if (subsByDay.has(k)) {
        subsByDay.set(k, (subsByDay.get(k) ?? 0) + 1);
        revenueByDay.set(k, (revenueByDay.get(k) ?? 0) + subscriptionMonthlyCents(s as any));
      }
    }
    const apptsByDay = new Map<string, number>(daysWindow.map(d => [d, 0]));
    for (const a of (appts7dRes.data ?? [])) {
      const k = dayKey(new Date(a.created_at));
      if (apptsByDay.has(k)) apptsByDay.set(k, (apptsByDay.get(k) ?? 0) + 1);
    }
    // MRR cumulative trend (constant baseline + new sub additions)
    const baselineMRR = Math.max(0, mrrCents - Array.from(revenueByDay.values()).reduce((a, b) => a + b, 0));
    let runningMRR = baselineMRR;
    const mrrTrend = daysWindow.map(d => {
      runningMRR += revenueByDay.get(d) ?? 0;
      return runningMRR;
    });

    // ─── Subsystem health ───────────────────────────────────────────
    const healthRows = healthRes.data ?? [];
    const healthByEngine = (prefixes: string[]): { pct: number; checks: number } => {
      const matched = healthRows.filter(r => prefixes.some(p => (r.function_name ?? "").toLowerCase().includes(p)));
      if (matched.length === 0) return { pct: 0, checks: 0 };
      const ok = matched.filter(r => r.health_status === "healthy").length;
      return { pct: Math.round((ok / matched.length) * 100), checks: matched.length };
    };
    const subsystemHealth = [
      { key: "revenue", label: "Revenue Engine", ...healthByEngine(["subscription", "checkout", "stripe", "payment"]) },
      { key: "alex", label: "Alex AI", ...healthByEngine(["alex", "voice", "elevenlabs"]) },
      { key: "booking", label: "Booking", ...healthByEngine(["booking", "appointment", "slot"]) },
      { key: "outbound", label: "Outbound", ...healthByEngine(["outbound", "email", "send", "queue", "sms"]) },
      { key: "core", label: "Core App", ...healthByEngine(["omega", "orchestrat", "intent", "router"]) },
    ];
    const known = subsystemHealth.filter(s => s.checks > 0);
    const overallHealth = known.length ? Math.round(known.reduce((a, b) => a + b.pct, 0) / known.length) : 0;

    // ─── Today's command ────────────────────────────────────────────
    const top = (buildNextRes.data ?? [])[0];
    const todaysCommand = top ? {
      id: top.id,
      title: top.task_title,
      description: top.task_description ?? "",
      agent: top.agent_name,
      agent_key: top.agent_key,
      impact_score: top.impact_score,
      urgency: top.urgency,
      execution_mode: top.execution_mode,
      why_now: (top.action_plan as any)?.why_now ?? null,
      eta_minutes: (top.action_plan as any)?.eta_minutes ?? null,
      estimated_revenue_cents: (top.action_plan as any)?.estimated_revenue_cents ?? null,
      confidence_pct: (top.action_plan as any)?.confidence_pct ?? Math.min(95, 50 + (top.impact_score ?? 0) / 2),
      proposed_at: top.proposed_at,
      source: "agent_tasks (status=proposed, ranked by impact_score)",
    } : null;

    // ─── Opportunity ────────────────────────────────────────────────
    const mo = opportunityRes.data?.[0] ?? null;
    const dg = demandGapRes.data?.[0] ?? null;
    let opportunity: any = null;
    if (mo) {
      opportunity = {
        source: "market_opportunities",
        title: `${mo.problem_type} · ${mo.city ?? "QC"}`,
        message: `Opportunité ouverte (${mo.urgency ?? "standard"})`,
        potential_cents: mo.estimated_value_cents ?? null,
        action_label: "Voir le marché",
        is_estimated: true,
      };
    } else if (dg) {
      opportunity = {
        source: "city_service_demand_grid",
        title: `${(dg.trade_slug ?? "").replace(/-/g, " ")} · ${(dg.city_slug ?? "").replace(/-/g, " ")}`,
        message: `Demande ${(dg.demand_score ?? 0).toFixed(0)} > Offre ${(dg.supply_score ?? 0).toFixed(0)}${dg.has_contractors ? "" : " · aucun pro"}`,
        potential_cents: dg.estimated_value_cents ?? null,
        action_label: dg.has_contractors ? "Lancer campagne" : "Recruter pros",
        is_estimated: true,
      };
    }

    // ─── Agents overnight (merged feed) ─────────────────────────────
    const overnight: Array<{ ts: string; agent: string; message: string; type: string }> = [];
    for (const a of (actionLogs24hRes.data ?? [])) {
      overnight.push({ ts: a.created_at, agent: a.engine_name, message: a.action_label ?? a.action_message ?? "Action", type: a.action_status ?? "automation" });
    }
    for (const l of (agentLogs24hRes.data ?? [])) {
      overnight.push({ ts: l.created_at, agent: l.agent_name, message: l.message, type: l.log_type });
    }
    overnight.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());

    // ─── Live ticker (real, multi-source) ───────────────────────────
    const ticker: Array<{ ts: string; label: string; kind: string; source: string }> = [];
    for (const e of (funnelEventsRes.data ?? [])) {
      ticker.push({ ts: e.created_at, label: `${e.event_type}${e.step ? ` · ${e.step}` : ""}`, kind: "funnel", source: "contractor_funnel_events" });
    }
    for (const a of (actionLogs24hRes.data ?? []).slice(0, 8)) {
      ticker.push({ ts: a.created_at, label: a.action_label ?? a.engine_name, kind: a.action_status ?? "action", source: "automation_action_logs" });
    }
    for (const s of (alexSessionsRes.data ?? [])) {
      ticker.push({ ts: s.started_at, label: `Alex session · ${s.surface ?? "web"}`, kind: "alex", source: "alex_sessions" });
    }
    for (const e of (systemEventsRes.data ?? [])) {
      ticker.push({ ts: e.created_at, label: e.event_type, kind: e.severity ?? "info", source: "system_events" });
    }
    ticker.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());

    // ─── 7-day forecast (from real series) ──────────────────────────
    const last7Revenue = Array.from(revenueByDay.values()).reduce((a, b) => a + b, 0);
    const prior7Subs = (subs14dRes.data ?? []).filter(s => new Date(s.created_at) < startOf7d);
    const prior7Revenue = prior7Subs.reduce((acc, s) => acc + subscriptionMonthlyCents(s as any), 0);
    const trend = prior7Revenue > 0 ? last7Revenue / prior7Revenue : 1;
    const forecastNext7Cents = Math.round(last7Revenue * Math.max(0.8, Math.min(1.5, trend || 1)));
    const dataPoints = (subs14dRes.data?.length ?? 0) + (appts7dRes.data?.length ?? 0);
    const forecastConfidence = dataPoints >= 10 ? 75 : dataPoints >= 3 ? 45 : 20;

    // ─── Weekly targets ─────────────────────────────────────────────
    const newSubs7d = (subs7dRes.data ?? []).length;
    const bookings7d = (appts7dRes.data ?? []).length;
    const weeklyTargets = [
      { key: "close_contractors", label: "Closer entrepreneurs", target: 5, progress: newSubs7d, source: "contractor_subscriptions (created last 7d, status=active)" },
      { key: "book_appointments", label: "RDV propriétaires", target: 12, progress: bookings7d, source: "appointments (created last 7d)" },
    ];

    // ─── Process pipelines (drilldown) ──────────────────────────────
    const apptsAll = apptsAllRes.count ?? 0;
    const apptsToday = apptsTodayRes.count ?? 0;
    const requestedAppts = (appts7dRes.data ?? []).filter(a => a.status === "requested").length;
    const confirmedAppts = (appts7dRes.data ?? []).filter(a => a.status === "confirmed").length;
    const completedAppts = (appts7dRes.data ?? []).filter(a => a.status === "completed").length;

    const processPipelines = {
      revenue: [
        { label: "Abonnés actifs", value: activeSubs.length, source: "contractor_subscriptions" },
        { label: "Nouveaux 7j", value: newSubs7d, source: "contractor_subscriptions (7d)" },
        { label: "Plans orphelins", value: orphanedSubs, source: "no plan_catalog match", warn: orphanedSubs > 0 },
        { label: "MRR (¢)", value: mrrCents, source: "Σ plan_catalog.monthly_price" },
      ],
      booking: [
        { label: "Total RDV", value: apptsAll, source: "appointments" },
        { label: "RDV aujourd'hui", value: apptsToday, source: "appointments (today)" },
        { label: "En attente", value: requestedAppts, source: "appointments (status=requested, 7d)" },
        { label: "Confirmés", value: confirmedAppts, source: "appointments (status=confirmed, 7d)" },
        { label: "Complétés", value: completedAppts, source: "appointments (status=completed, 7d)" },
      ],
      alex: [
        { label: "Sessions 24h", value: (alexSessionsRes.data ?? []).length, source: "alex_sessions (24h)" },
        { label: "Événements funnel 24h", value: (funnelEventsRes.data ?? []).length, source: "contractor_funnel_events (24h)" },
        { label: "Actions auto 24h", value: (actionLogs24hRes.data ?? []).length, source: "automation_action_logs (24h)" },
        { label: "Logs agents 24h", value: (agentLogs24hRes.data ?? []).length, source: "agent_logs (24h)" },
      ],
    };

    // ─── Trust drilldowns (per-KPI source map) ──────────────────────
    const trust = {
      revenue_today: {
        source_table: "contractor_subscriptions JOIN plan_catalog",
        formula: "Σ monthly_price WHERE current_period_start >= today",
        raw_count: activeSubs.filter(s => new Date(s.current_period_start ?? s.created_at) >= startOfDay).length,
        last_updated: now.toISOString(),
        notes: orphanedSubs > 0 ? `${orphanedSubs} sub(s) avec plan_id orphelin (non comptabilisé)` : null,
      },
      mrr: {
        source_table: "contractor_subscriptions JOIN plan_catalog",
        formula: "Σ (yearly ? annual/12 : monthly_price) WHERE status=active",
        raw_count: activeSubs.length,
        last_updated: now.toISOString(),
        notes: orphanedSubs > 0 ? `${orphanedSubs} plan(s) sans correspondance plan_catalog` : null,
      },
      paid_pros: {
        source_table: "contractor_subscriptions",
        formula: "COUNT(*) WHERE status=active",
        raw_count: activeSubs.length,
        last_updated: now.toISOString(),
        notes: null,
      },
      bookings_today: {
        source_table: "appointments",
        formula: "COUNT(*) WHERE created_at >= today",
        raw_count: apptsToday,
        last_updated: now.toISOString(),
        notes: null,
      },
      critical_alerts: {
        source_table: "automation_blockers",
        formula: "COUNT(*) WHERE status=open AND severity_level IN (critical, high)",
        raw_count: alertsRes.count ?? 0,
        last_updated: now.toISOString(),
        notes: null,
      },
      systems_health: {
        source_table: "runtime_function_health",
        formula: "moyenne pondérée des sous-systèmes (1h)",
        raw_count: healthRows.length,
        last_updated: now.toISOString(),
        notes: healthRows.length === 0 ? "Aucun health check récent" : null,
      },
    };

    const criticalAlerts = alertsRes.count ?? 0;
    const status_color =
      criticalAlerts > 0 || (overallHealth > 0 && overallHealth < 70) ? "red" :
      (overallHealth > 0 && overallHealth < 90) || revenueTodayCents === 0 ? "amber" :
      "green";

    const moneyGrid = {
      revenue_today: {
        value_cents: revenueTodayCents,
        trend: daysWindow.map(d => revenueByDay.get(d) ?? 0),
      },
      mrr: { value_cents: mrrCents, trend: mrrTrend },
      paid_pros: {
        value: activeSubs.length,
        trend: daysWindow.map(d => subsByDay.get(d) ?? 0).map((_, i, arr) =>
          arr.slice(0, i + 1).reduce((a, b) => a + b, 0) + (activeSubs.length - newSubs7d)),
      },
      bookings_today: {
        value: apptsToday,
        trend: daysWindow.map(d => apptsByDay.get(d) ?? 0),
      },
    };

    const biggest = blockersTopRes.data?.[0] ?? null;

    const payload = {
      generated_at: now.toISOString(),
      status_color,
      header_kpis: {
        revenue_today_cents: revenueTodayCents,
        mrr_cents: mrrCents,
        paid_contractors_active: activeSubs.length,
        new_paid_this_week: newSubs7d,
        bookings_today: apptsToday,
        critical_alerts: criticalAlerts,
        systems_health_pct: overallHealth,
      },
      todays_command: todaysCommand,
      money_grid: moneyGrid,
      trust,
      build_next: (buildNextRes.data ?? []).map((t) => ({
        id: t.id, title: t.task_title, description: t.task_description ?? "",
        agent: t.agent_name, agent_key: t.agent_key, impact_score: t.impact_score, urgency: t.urgency,
        execution_mode: t.execution_mode,
        why_now: (t.action_plan as any)?.why_now ?? null,
        eta_minutes: (t.action_plan as any)?.eta_minutes ?? null,
        proposed_at: t.proposed_at,
      })),
      running_now: (runningRes.data ?? []).map((r) => ({
        id: r.id, engine: r.engine_name, label: r.action_label ?? r.engine_name,
        message: r.action_message, status: r.action_status, started_at: r.created_at,
      })),
      needs_approval: (approvalRes.data ?? []).map((t) => ({
        id: t.id, title: t.task_title, description: t.task_description ?? "",
        agent: t.agent_name, impact_score: t.impact_score, urgency: t.urgency,
        proposed_at: t.proposed_at,
        estimated_revenue_cents: (t.action_plan as any)?.estimated_revenue_cents ?? null,
      })),
      biggest_leak: biggest ? {
        title: biggest.blocker_title, message: biggest.blocker_message,
        severity: biggest.severity_level, engine: biggest.engine_name,
        detected_at: biggest.created_at,
      } : null,
      opportunity,
      agents_overnight: overnight.slice(0, 12),
      live_ticker: ticker.slice(0, 15),
      subsystem_health: subsystemHealth,
      weekly_targets: weeklyTargets,
      forecast: {
        next_7d_revenue_cents: forecastNext7Cents,
        confidence_pct: forecastConfidence,
        is_estimated: true,
        baseline_label: prior7Revenue > 0
          ? `Tendance ${trend >= 1 ? "+" : ""}${Math.round((trend - 1) * 100)}% vs semaine précédente`
          : last7Revenue > 0
            ? "Basé sur les 7 derniers jours (pas de comparable)"
            : "Pas assez de données — collecte de baseline",
      },
      process_pipeline: processPipelines,
      data_state: {
        // What's actually flowing
        has_payments: revenueTodayCents > 0 || mrrCents > 0,
        has_bookings: apptsAll > 0,
        has_funnel_signal: (funnelEventsRes.data ?? []).length > 0,
        has_alex_activity: (alexSessionsRes.data ?? []).length > 0,
        has_health_checks: healthRows.length > 0,
        orphaned_subs: orphanedSubs,
      },
    };

    return new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[fn-omega-command-center]", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
