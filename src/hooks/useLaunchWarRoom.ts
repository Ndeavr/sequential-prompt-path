/**
 * UNPRO — Launch War Room hook.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useLaunchWarRoom() {
  return useQuery({
    queryKey: ["launch-war-room"],
    refetchInterval: 5000,
    queryFn: async () => {
      const [stateRes, leadsRes, eventsRes] = await Promise.all([
        supabase.from("launch_mode_state" as any).select("*").eq("id", true).maybeSingle(),
        supabase.from("launch_leads" as any).select("lead_status, revenue_impact_cents, reply_classification, last_event_at"),
        supabase.from("launch_pipeline_events" as any).select("*").order("created_at", { ascending: false }).limit(50),
      ]);
      const leads = (leadsRes.data ?? []) as any[];
      const byStatus: Record<string, number> = {};
      for (const l of leads) byStatus[l.lead_status] = (byStatus[l.lead_status] ?? 0) + 1;
      const revenue = leads.reduce((s, l) => s + (l.revenue_impact_cents ?? 0), 0);
      const replies = leads.filter(l => l.lead_status === "REPLIED" || l.reply_classification).length;
      return {
        state: stateRes.data as any,
        byStatus,
        revenueCents: revenue,
        replies,
        events: (eventsRes.data ?? []) as any[],
        totalLeads: leads.length,
      };
    },
  });
}
