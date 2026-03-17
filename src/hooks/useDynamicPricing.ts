/**
 * UNPRO — Hooks for Dynamic Pricing, SLA, Wallets, AI Optimization
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ─── Dynamic Pricing Settings ───
export function useDynamicPricingSettings() {
  return useQuery({
    queryKey: ["dynamic-pricing-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dynamic_pricing_settings")
        .select("*")
        .order("setting_key");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUpdatePricingSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, value }: { id: string; value: any }) => {
      const { error } = await supabase
        .from("dynamic_pricing_settings")
        .update({ setting_value: value })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dynamic-pricing-settings"] });
      toast.success("Paramètre mis à jour");
    },
  });
}

// ─── Emergency Pricing Base ───
export function useEmergencyPricingBase() {
  return useQuery({
    queryKey: ["emergency-pricing-base"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("emergency_pricing_base")
        .select("*")
        .eq("is_active", true)
        .order("category");
      if (error) throw error;
      return data ?? [];
    },
  });
}

// ─── SLA Tiers ───
export function useSlaTiers() {
  return useQuery({
    queryKey: ["sla-tiers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sla_tiers")
        .select("*")
        .eq("is_active", true)
        .order("display_order");
      if (error) throw error;
      return data ?? [];
    },
  });
}

// ─── Dynamic Pricing Logs ───
export function useDynamicPricingLogs(limit = 20) {
  return useQuery({
    queryKey: ["dynamic-pricing-logs", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dynamic_pricing_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data ?? [];
    },
  });
}

// ─── SLA Assignments ───
export function useSlaAssignments(limit = 20) {
  return useQuery({
    queryKey: ["sla-assignments", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sla_assignments")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data ?? [];
    },
  });
}

// ─── Contractor Wallets ───
export function useContractorWallets(limit = 20) {
  return useQuery({
    queryKey: ["contractor-wallets", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contractor_wallet")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data ?? [];
    },
  });
}

// ─── Pricing Transactions ───
export function usePricingTransactions(limit = 30) {
  return useQuery({
    queryKey: ["pricing-transactions", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pricing_transactions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data ?? [];
    },
  });
}

// ─── AI Optimization Logs ───
export function useAiOptimizationLogs(limit = 20) {
  return useQuery({
    queryKey: ["ai-optimization-logs", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_optimization_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data ?? [];
    },
  });
}

// ─── AI Recommendations ───
export function useAiRecommendations() {
  return useQuery({
    queryKey: ["ai-recommendations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_recommendations")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUpdateRecommendation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes?: string }) => {
      const { error } = await supabase
        .from("ai_recommendations")
        .update({ status, review_notes: notes, reviewed_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-recommendations"] });
      toast.success("Recommandation mise à jour");
    },
  });
}

// ─── Emergency Demand Metrics ───
export function useEmergencyDemandMetrics() {
  return useQuery({
    queryKey: ["emergency-demand-metrics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("emergency_demand_metrics")
        .select("*")
        .order("recorded_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });
}

// ─── Contractor Dispatch Stats ───
export function useContractorDispatchStats(limit = 20) {
  return useQuery({
    queryKey: ["contractor-dispatch-stats", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contractor_dispatch_stats")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data ?? [];
    },
  });
}
