/**
 * UNPRO — Launch War Room hook.
 * Reads launch state + pipeline counts + recent events + secret readiness, and
 * subscribes to launch_pipeline_events realtime for the live event stream.
 * Also reads truth views v_launch_funnel + v_launch_agent_health.
 */
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ReadinessResp {
  status: Record<string, boolean>;
  missingCritical: string[];
  ready: boolean;
}

export function useLaunchWarRoom() {
  const qc = useQueryClient();

  useEffect(() => {
    const ch = supabase
      .channel("launch-pipeline-events-live")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "launch_pipeline_events" },
        () => qc.invalidateQueries({ queryKey: ["launch-war-room"] }),
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  return useQuery({
    queryKey: ["launch-war-room"],
    refetchInterval: 10000,
    queryFn: async () => {
      const [stateRes, leadsRes, eventsRes, readinessRes, funnelRes, healthRes, pendingRes] = await Promise.all([
        supabase.from("launch_mode_state" as any).select("*").eq("id", true).maybeSingle(),
        supabase.from("launch_leads" as any).select("lead_status, revenue_impact_cents, reply_classification, block_reason, last_event_at"),
        supabase.from("launch_pipeline_events" as any).select("*").order("created_at", { ascending: false }).limit(80),
        supabase.functions.invoke("launch-readiness", { body: {} }).catch(() => ({ data: null, error: null })),
        supabase.from("v_launch_funnel" as any).select("*").maybeSingle(),
        supabase.from("v_launch_agent_health" as any).select("*").order("runs_24h", { ascending: false }),
        supabase
          .from("launch_leads" as any)
          .select("id, last_event_at")
          .eq("lead_status", "CHECKOUT_SENT")
          .not("stripe_session_id", "is", null)
          .order("last_event_at", { ascending: true })
          .limit(1),
      ]);

      const leads = (leadsRes.data ?? []) as any[];
      const byStatus: Record<string, number> = {};
      for (const l of leads) byStatus[l.lead_status] = (byStatus[l.lead_status] ?? 0) + 1;
      const revenue = leads.reduce((s, l) => s + (l.revenue_impact_cents ?? 0), 0);
      const replies = leads.filter(l => l.lead_status === "REPLIED" || l.reply_classification).length;
      const events = (eventsRes.data ?? []) as any[];

      const lastScout = events.find(e => e.agent === "launch-agent-scout" && (e.event === "discovered_batch" || e.event === "blocked"));
      const lastScoutPayload = (lastScout?.payload ?? null) as any;

      const pendingCheckouts = byStatus["CHECKOUT_SENT"] ?? 0;
      const oldestPending = (pendingRes.data ?? [])[0] as any;
      const oldestPendingAgeMin = oldestPending?.last_event_at
        ? Math.floor((Date.now() - new Date(oldestPending.last_event_at).getTime()) / 60000)
        : null;

      return {
        state: stateRes.data as any,
        byStatus,
        revenueCents: revenue,
        replies,
        events,
        totalLeads: leads.length,
        readiness: (readinessRes.data as ReadinessResp | null) ?? null,
        lastScoutPayload,
        lastScoutEvent: lastScout ?? null,
        funnel: (funnelRes.data ?? null) as any,
        agentHealth: ((healthRes.data ?? []) as any[]),
        pendingCheckouts,
        oldestPendingAgeMin,
      };
    },
  });
}
