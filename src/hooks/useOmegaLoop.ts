/**
 * UNPRO — Omega Loop hooks (admin-only)
 * Reads omega_loop_runs, expansion_opportunities, churn_signals.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const PHASES = [
  "prospect_discovery",
  "enrichment",
  "scoring",
  "campaign_generation",
  "outreach_send",
  "reply_handling",
  "alex_closing",
  "payment_followup",
  "onboarding_activation",
  "expansion_scan",
  "churn_rescue",
  "metrics_optimize",
] as const;
export type OmegaPhase = (typeof PHASES)[number];

export interface OmegaPhaseRun {
  id: string;
  phase: OmegaPhase;
  status: "running" | "success" | "failed" | "skipped";
  started_at: string;
  ended_at: string | null;
  stats: Record<string, unknown>;
  errors: unknown[];
}

export const useOmegaLoopToday = () => {
  return useQuery({
    queryKey: ["omega-loop-today"],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("omega_loop_runs")
        .select("id, phase, status, started_at, ended_at, stats, errors")
        .eq("loop_date", today)
        .order("started_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as OmegaPhaseRun[];
    },
    refetchInterval: 30_000,
  });
};

export const useExpansionQueue = () => {
  return useQuery({
    queryKey: ["expansion-queue"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expansion_opportunities")
        .select("id, contractor_id, current_plan, recommended_plan, signal, status, created_at")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 60_000,
  });
};

export const useChurnQueue = () => {
  return useQuery({
    queryKey: ["churn-queue"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("churn_signals")
        .select("id, contractor_id, signal_type, severity, detected_at")
        .eq("status", "open")
        .order("severity", { ascending: false })
        .order("detected_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 60_000,
  });
};

export const useTriggerPhase = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (phase: OmegaPhase) => {
      const { data, error } = await supabase.functions.invoke("omega-conductor", {
        body: { phase },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["omega-loop-today"] }),
  });
};

export const PHASE_LABELS: Record<OmegaPhase, string> = {
  prospect_discovery: "Prospection",
  enrichment: "Enrichissement",
  scoring: "Score AIPP",
  campaign_generation: "Génération campagnes",
  outreach_send: "Envoi vagues",
  metrics_optimize: "Métriques nuit",
};

export const ALL_PHASES = PHASES;
