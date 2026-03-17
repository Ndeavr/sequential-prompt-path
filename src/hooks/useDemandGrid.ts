/**
 * UNPRO — City-Service-Demand Grid Hook
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { DemandGridCell } from "@/services/demandGridEngine";

export const useDemandGrid = (filters?: { city?: string; trade?: string; season?: string }) =>
  useQuery<DemandGridCell[]>({
    queryKey: ["demand-grid", filters],
    queryFn: async () => {
      let q = supabase.from("city_service_demand_grid").select("*").order("gap_score", { ascending: false });
      if (filters?.city) q = q.eq("city_slug", filters.city);
      if (filters?.trade) q = q.eq("trade_slug", filters.trade);
      if (filters?.season) q = q.eq("season", filters.season);
      const { data, error } = await q.limit(500);
      if (error) throw error;
      return (data ?? []) as unknown as DemandGridCell[];
    },
    staleTime: 30_000,
  });

export const useDemandGridStats = () =>
  useQuery({
    queryKey: ["demand-grid-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.from("city_service_demand_grid").select("gap_score, demand_score, supply_score, has_seo_page, has_ad_campaign, has_contractors");
      if (error) throw error;
      const cells = data ?? [];
      const highGap = cells.filter((c) => (c.gap_score ?? 0) > 40);
      const uncovered = cells.filter((c) => !c.has_seo_page && !c.has_ad_campaign);
      return {
        totalCells: cells.length,
        highGapCount: highGap.length,
        uncoveredCount: uncovered.length,
        avgDemand: cells.length > 0 ? cells.reduce((s, c) => s + (c.demand_score ?? 0), 0) / cells.length : 0,
        avgSupply: cells.length > 0 ? cells.reduce((s, c) => s + (c.supply_score ?? 0), 0) / cells.length : 0,
        withSeo: cells.filter((c) => c.has_seo_page).length,
        withAds: cells.filter((c) => c.has_ad_campaign).length,
        withContractors: cells.filter((c) => c.has_contractors).length,
      };
    },
    staleTime: 60_000,
  });

export const useUpdateGridCell = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<DemandGridCell> }) => {
      const { error } = await supabase.from("city_service_demand_grid").update(updates as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["demand-grid"] });
      toast.success("Cellule mise à jour");
    },
  });
};
