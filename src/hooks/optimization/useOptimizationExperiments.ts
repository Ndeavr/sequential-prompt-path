/**
 * UNPRO — Optimization Experiments Hook
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { OptimizationExperiment, ExperimentStatus } from "@/types/optimization";

export function useOptimizationExperiments(status?: ExperimentStatus) {
  return useQuery({
    queryKey: ["optimization-experiments", status],
    queryFn: async () => {
      let q = supabase
        .from("optimization_experiments")
        .select("*")
        .order("created_at", { ascending: false });
      if (status) q = q.eq("status", status);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as OptimizationExperiment[];
    },
  });
}

export function useExperimentWithVariants(id: string | undefined) {
  return useQuery({
    queryKey: ["optimization-experiment", id],
    enabled: !!id,
    queryFn: async () => {
      const { data: exp, error } = await supabase
        .from("optimization_experiments")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      const { data: variants } = await supabase
        .from("optimization_variants")
        .select("*")
        .eq("experiment_id", id!)
        .order("is_control", { ascending: false });
      return { ...(exp as unknown as OptimizationExperiment), variants: variants ?? [] };
    },
  });
}

export function useUpdateExperimentStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ExperimentStatus }) => {
      const updates: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
      if (status === "running") updates.started_at = new Date().toISOString();
      if (status === "completed" || status === "archived") updates.ended_at = new Date().toISOString();
      const { error } = await supabase.from("optimization_experiments").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["optimization-experiments"] });
      qc.invalidateQueries({ queryKey: ["optimization-experiment"] });
      toast.success("Statut mis à jour");
    },
  });
}

export function useOptimizationOpportunities() {
  return useQuery({
    queryKey: ["optimization-opportunities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("optimization_opportunities")
        .select("*")
        .eq("status", "open")
        .order("confidence_score", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useWinningVariants() {
  return useQuery({
    queryKey: ["winning-variants"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("winning_variants")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useOptimizationRules() {
  return useQuery({
    queryKey: ["optimization-rules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("optimization_rules")
        .select("*")
        .order("rule_key");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useToggleRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("optimization_rules").update({ is_active, updated_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["optimization-rules"] });
      toast.success("Règle mise à jour");
    },
  });
}

export function useOptimizationAlerts() {
  return useQuery({
    queryKey: ["optimization-alerts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("optimization_alerts")
        .select("*")
        .eq("status", "open")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useOptimizationKPIs() {
  return useQuery({
    queryKey: ["optimization-kpis"],
    queryFn: async () => {
      const [experiments, opportunities, winners, alerts] = await Promise.all([
        supabase.from("optimization_experiments").select("id, status", { count: "exact" }),
        supabase.from("optimization_opportunities").select("id", { count: "exact" }).eq("status", "open"),
        supabase.from("winning_variants").select("primary_metric_lift_percent"),
        supabase.from("optimization_alerts").select("id", { count: "exact" }).eq("status", "open"),
      ]);
      const running = (experiments.data ?? []).filter((e: any) => e.status === "running").length;
      const lifts = (winners.data ?? []).map((w: any) => w.primary_metric_lift_percent || 0);
      const avgLift = lifts.length ? lifts.reduce((a: number, b: number) => a + b, 0) / lifts.length : 0;
      return {
        activeExperiments: running,
        totalExperiments: experiments.count ?? 0,
        openOpportunities: opportunities.count ?? 0,
        winningVariants: winners.data?.length ?? 0,
        avgLift: Math.round(avgLift * 100) / 100,
        openAlerts: alerts.count ?? 0,
      };
    },
  });
}
