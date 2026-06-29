/**
 * UNPRO — useDemandSignal
 * Creates a demand signal from a homeowner project and returns
 * the waiting position + recommendation availability.
 */
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type DemandSignalInput = {
  project_id: string;
  homeowner_id: string;
  city: string;
  category: string;
  subcategory?: string | null;
  postal_code?: string | null;
  estimated_project_value?: number;
  estimated_ltv?: number;
  urgency_score?: number;
};

export type DemandSignalResult = {
  ok: boolean;
  signal?: {
    id: string;
    position_in_queue: number | null;
    status: string;
    matched_contractor_id: string | null;
    city: string;
    category: string;
  };
  market?: {
    homeowner_count: number;
    supply_count: number;
    gap_score: number;
    pressure_score: number;
    estimated_revenue: number;
  } | null;
  recruitment_target?: { landing_slug: string; status: string } | null;
  has_match_path?: boolean;
  error?: string;
};

export function useCreateDemandSignal() {
  return useMutation({
    mutationFn: async (input: DemandSignalInput): Promise<DemandSignalResult> => {
      const { data, error } = await supabase.functions.invoke("demand-signal-create", { body: input });
      if (error) throw error;
      return data as DemandSignalResult;
    },
  });
}

export function useMarketDemand(city?: string | null, category?: string | null) {
  return useQuery({
    queryKey: ["market_demand", city, category],
    enabled: !!(city && category),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("market_demand")
        .select("*")
        .eq("city", city!)
        .eq("category", category!.toLowerCase())
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useWaitingHomeowners() {
  return useQuery({
    queryKey: ["waiting_homeowners"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("market_demand")
        .select("city, category, homeowner_count, estimated_revenue, estimated_ltv, pressure_score, supply_count, gap_score, last_signal_at")
        .gt("homeowner_count", 0)
        .order("pressure_score", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 30_000,
  });
}
