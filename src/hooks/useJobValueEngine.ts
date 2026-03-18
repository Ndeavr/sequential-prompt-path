/**
 * UNPRO — Job Value Engine Hooks
 * Provides trade benchmarks, city factors, and dynamic estimation via RPC.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ─── Types ───

export interface JobValueEstimate {
  trade_slug: string;
  specialty_slug: string | null;
  city_slug: string | null;
  base_avg_value: number;
  city_multiplier: number;
  competition_multiplier: number;
  seasonality_multiplier: number;
  urgency_multiplier: number;
  final_avg_value: number;
  min_value: number;
  median_value: number;
  max_value: number;
  default_closing_rate: number;
  default_profit_margin: number;
  default_monthly_capacity: number;
  confidence_score: number;
  reasoning: string[];
  error?: string;
}

export interface EstimateParams {
  tradeSlug: string;
  specialtySlug?: string;
  citySlug?: string;
  isEmergency?: boolean;
  isPremium?: boolean;
}

// ─── Reference Data Hooks ───

export function useJveTrades() {
  return useQuery({
    queryKey: ["jve-trades"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jve_trades")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useJveTradeSpecialties(tradeSlug?: string) {
  return useQuery({
    queryKey: ["jve-specialties", tradeSlug],
    queryFn: async () => {
      let query = supabase
        .from("jve_trade_specialties")
        .select("*, jve_trades!inner(slug)")
        .eq("is_active", true);
      if (tradeSlug) {
        query = query.eq("jve_trades.slug", tradeSlug);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!tradeSlug,
    staleTime: 5 * 60 * 1000,
  });
}

export function useJveRegions() {
  return useQuery({
    queryKey: ["jve-regions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jve_regions")
        .select("*")
        .order("name_fr");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 10 * 60 * 1000,
  });
}

export function useJveCities(regionSlug?: string) {
  return useQuery({
    queryKey: ["jve-cities", regionSlug],
    queryFn: async () => {
      let query = supabase
        .from("jve_cities")
        .select("*, jve_regions!inner(slug, name_fr)")
        .eq("is_active", true)
        .order("name_fr");
      if (regionSlug) {
        query = query.eq("jve_regions.slug", regionSlug);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

// ─── Estimation RPC ───

export function useJobValueEstimate(params: EstimateParams | null) {
  return useQuery({
    queryKey: ["jve-estimate", params],
    queryFn: async () => {
      if (!params) return null;
      const { data, error } = await supabase.rpc("get_avg_job_value", {
        p_trade_slug: params.tradeSlug,
        p_specialty_slug: params.specialtySlug ?? null,
        p_city_slug: params.citySlug ?? null,
        p_is_emergency: params.isEmergency ?? false,
        p_is_premium: params.isPremium ?? false,
      });
      if (error) throw error;
      return data as unknown as JobValueEstimate;
    },
    enabled: !!params?.tradeSlug,
    staleTime: 2 * 60 * 1000,
  });
}

// ─── Benchmarks ───

export function useJveBenchmarks(tradeSlug?: string) {
  return useQuery({
    queryKey: ["jve-benchmarks", tradeSlug],
    queryFn: async () => {
      let query = supabase
        .from("jve_trade_value_benchmarks")
        .select("*, jve_trades!inner(slug, name_fr)")
        .order("default_avg_value", { ascending: false });
      if (tradeSlug) {
        query = query.eq("jve_trades.slug", tradeSlug);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

// ─── Calculator Session Logging ───

export function useSaveCalculatorSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (session: {
      trade_id?: string;
      specialty_id?: string;
      city_id?: string;
      inputs: Record<string, unknown>;
      outputs: Record<string, unknown>;
      recommended_plan?: string;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase.from("jve_calculator_sessions").insert({
        user_id: userData?.user?.id ?? null,
        trade_id: session.trade_id ?? null,
        specialty_id: session.specialty_id ?? null,
        city_id: session.city_id ?? null,
        inputs: session.inputs,
        outputs: session.outputs,
        recommended_plan: session.recommended_plan ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jve-sessions"] });
    },
  });
}
