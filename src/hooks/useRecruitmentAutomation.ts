import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useRecruitmentAutomation() {
  const funnelStats = useQuery({
    queryKey: ["recruitment-funnel-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rpc_get_recruitment_funnel_stats");
      if (error) throw error;
      return data as Record<string, number>;
    },
  });

  const exceptions = useQuery({
    queryKey: ["recruitment-exceptions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contractor_recruitment_exceptions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const auditLogs = useQuery({
    queryKey: ["recruitment-audit-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contractor_recruitment_audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  const events = useQuery({
    queryKey: ["recruitment-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contractor_recruitment_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  return { funnelStats, exceptions, auditLogs, events };
}
