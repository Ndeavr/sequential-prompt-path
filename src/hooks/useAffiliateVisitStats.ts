import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface AffiliateVisitStats {
  affiliate_id: string;
  total_sessions: number;
  internal_sessions: number;
  attributed_sessions: number;
}

export function useAffiliateVisitStats(affiliateId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["affiliate-visit-stats", user?.id, affiliateId ?? "all"],
    enabled: !!user?.id,
    refetchInterval: 60_000,
    queryFn: async (): Promise<AffiliateVisitStats[]> => {
      const { data, error } = await supabase.rpc("get_affiliate_visit_stats" as never,
        { p_affiliate_id: affiliateId ?? null } as never);
      if (error) throw error;
      if (!Array.isArray(data)) throw new Error("Compteurs indisponibles");
      return data as AffiliateVisitStats[];
    },
  });
}
