/**
 * UNPRO Omega — Founder Command Center API
 * ─────────────────────────────────────────
 * Aggregates ONLY real data from existing tables. No mocks.
 *
 * Returns:
 *   • header_kpis      → revenue today, MRR estimate, paid contractors, bookings, alerts, health %
 *   • build_next       → top 3 highest-ROI tasks pulled from agent_tasks (status='proposed')
 *   • running_now      → automation_action_logs with status='running'
 *   • needs_approval   → agent_tasks with execution_mode='requires_approval' and status='proposed'
 *   • biggest_leak     → derived from automation_blockers (severity critical/high) + funnel events
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PLAN_PRICE_CENTS: Record<string, number> = {
  recrue: 14900,
  pro: 34900,
  premium: 59900,
  elite: 99900,
  signature: 179900,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceKey);

    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - 7);

    // ─── Real revenue & subscriptions ───────────────────────────────
    const [subsRes, paidWeekRes, bookingsTodayRes, alertsRes, blockersRes] =
      await Promise.all([
        sb
          .from("contractor_subscriptions")
          .select("plan_id, status, billing_interval, current_period_start")
          .eq("status", "active"),
        sb
          .from("contractor_subscriptions")
          .select("id", { count: "exact", head: true })
          .eq("status", "active")
          .gte("current_period_start", startOfWeek.toISOString()),
        sb
          .from("appointments")
          .select("id", { count: "exact", head: true })
          .gte("created_at", startOfDay.toISOString()),
        sb
          .from("automation_blockers")
          .select("id", { count: "exact", head: true })
          .eq("status", "open")
          .in("severity_level", ["critical", "high"]),
        sb
          .from("automation_blockers")
          .select("blocker_title, blocker_message, severity_level, engine_name, created_at")
          .eq("status", "open")
          .order("severity_level", { ascending: true })
          .order("created_at", { ascending: false })
          .limit(1),
      ]);

    const activeSubs = subsRes.data ?? [];
    let mrrCents = 0;
    let revenueTodayCents = 0;
    for (const s of activeSubs) {
      const monthly = PLAN_PRICE_CENTS[s.plan_id] ?? 0;
      const normalized = s.billing_interval === "year" ? Math.round(monthly * 10 / 12) : monthly;
      mrrCents += normalized;
      if (s.current_period_start && new Date(s.current_period_start) >= startOfDay) {
        revenueTodayCents += normalized;
      }
    }

    // ─── Build next: top proposed agent tasks ───────────────────────
    const buildNextRes = await sb
      .from("agent_tasks")
      .select("id, task_title, task_description, agent_name, impact_score, urgency, execution_mode, action_plan, proposed_at")
      .eq("status", "proposed")
      .order("impact_score", { ascending: false })
      .order("proposed_at", { ascending: false })
      .limit(3);

    // ─── Running now ────────────────────────────────────────────────
    const runningRes = await sb
      .from("automation_action_logs")
      .select("id, engine_name, action_label, action_message, action_status, created_at")
      .in("action_status", ["running", "queued"])
      .order("created_at", { ascending: false })
      .limit(8);

    // ─── Needs approval ─────────────────────────────────────────────
    const approvalRes = await sb
      .from("agent_tasks")
      .select("id, task_title, task_description, agent_name, impact_score, urgency, proposed_at")
      .eq("status", "proposed")
      .eq("execution_mode", "requires_approval")
      .order("urgency", { ascending: false })
      .limit(8);

    // ─── Systems health ─────────────────────────────────────────────
    const healthRes = await sb
      .from("runtime_function_health")
      .select("status", { count: "exact" })
      .limit(500);
    const healthRows = healthRes.data ?? [];
    const healthy = healthRows.filter((r) => r.status === "healthy").length;
    const healthPct = healthRows.length > 0
      ? Math.round((healthy / healthRows.length) * 100)
      : 100;

    const biggest = blockersRes.data?.[0] ?? null;

    const payload = {
      generated_at: now.toISOString(),
      header_kpis: {
        revenue_today_cents: revenueTodayCents,
        mrr_cents: mrrCents,
        paid_contractors_active: activeSubs.length,
        new_paid_this_week: paidWeekRes.count ?? 0,
        bookings_today: bookingsTodayRes.count ?? 0,
        critical_alerts: alertsRes.count ?? 0,
        systems_health_pct: healthPct,
      },
      build_next: (buildNextRes.data ?? []).map((t) => ({
        id: t.id,
        title: t.task_title,
        description: t.task_description ?? "",
        agent: t.agent_name,
        impact_score: t.impact_score,
        urgency: t.urgency,
        execution_mode: t.execution_mode,
        why_now: (t.action_plan as any)?.why_now ?? null,
        eta_minutes: (t.action_plan as any)?.eta_minutes ?? null,
        proposed_at: t.proposed_at,
      })),
      running_now: (runningRes.data ?? []).map((r) => ({
        id: r.id,
        engine: r.engine_name,
        label: r.action_label ?? r.engine_name,
        message: r.action_message,
        status: r.action_status,
        started_at: r.created_at,
      })),
      needs_approval: (approvalRes.data ?? []).map((t) => ({
        id: t.id,
        title: t.task_title,
        description: t.task_description ?? "",
        agent: t.agent_name,
        impact_score: t.impact_score,
        urgency: t.urgency,
        proposed_at: t.proposed_at,
      })),
      biggest_leak: biggest
        ? {
            title: biggest.blocker_title,
            message: biggest.blocker_message,
            severity: biggest.severity_level,
            engine: biggest.engine_name,
            detected_at: biggest.created_at,
          }
        : null,
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
