/**
 * UNPRO — Launch War Room hook.
 * Reads launch state + pipeline counts + recent events + secret readiness, and
 * subscribes to launch_pipeline_events realtime for the live event stream.
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

  // Realtime: refresh on every new pipeline event
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
      const [stateRes, leadsRes, eventsRes, readinessRes] = await Promise.all([
        supabase.from("launch_mode_state" as any).select("*").eq("id", true).maybeSingle(),
        supabase.from("launch_leads" as any).select("lead_status, revenue_impact_cents, reply_classification, block_reason, last_event_at"),
        supabase.from("launch_pipeline_events" as any).select("*").order("created_at", { ascending: false }).limit(80),
        supabase.functions.invoke("launch-readiness", { body: {} }).catch(() => ({ data: null, error: null })),
      ]);
      const leads = (leadsRes.data ?? []) as any[];
      const byStatus: Record<string, number> = {};
      for (const l of leads) byStatus[l.lead_status] = (byStatus[l.lead_status] ?? 0) + 1;
      const revenue = leads.reduce((s, l) => s + (l.revenue_impact_cents ?? 0), 0);
      const replies = leads.filter(l => l.lead_status === "REPLIED" || l.reply_classification).length;
      const events = (eventsRes.data ?? []) as any[];

      // Last scout diagnostics (look at most recent scout event)
      const lastScout = events.find(e => e.agent === "launch-agent-scout" && (e.event === "discovered_batch" || e.event === "blocked"));
      const lastScoutPayload = (lastScout?.payload ?? null) as any;

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
      };
    },
  });
}
