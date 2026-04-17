import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ChallengeTarget {
  id: string;
  challenge_key: string;
  label: string;
  target_value: number;
  current_value: number;
  starts_at: string;
  ends_at: string;
  status: string;
  metadata: Record<string, unknown>;
}

export interface ChallengeAgentState {
  id: string;
  agent_key: string;
  agent_name: string;
  enabled: boolean;
  last_run_at: string | null;
  last_run_status: string | null;
  last_run_summary: Record<string, unknown> | null;
  last_error: string | null;
  total_runs: number;
  total_processed: number;
  config: Record<string, unknown>;
}

export interface ChallengeFunnelEvent {
  id: string;
  event_type: string;
  agent_source: string | null;
  funnel_stage: string | null;
  outbound_lead_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export function useChallengeTarget(challengeKey = "first_signup_72h") {
  return useQuery({
    queryKey: ["challenge-target", challengeKey],
    queryFn: async (): Promise<ChallengeTarget | null> => {
      const { data, error } = await supabase
        .from("challenge_targets")
        .select("*")
        .eq("challenge_key", challengeKey)
        .maybeSingle();
      if (error) throw error;
      return data as ChallengeTarget | null;
    },
    refetchInterval: 15000,
  });
}

export function useChallengeAgents() {
  return useQuery({
    queryKey: ["challenge-agents"],
    queryFn: async (): Promise<ChallengeAgentState[]> => {
      const { data, error } = await supabase
        .from("challenge_agent_state")
        .select("*")
        .order("agent_key");
      if (error) throw error;
      return (data ?? []) as ChallengeAgentState[];
    },
    refetchInterval: 10000,
  });
}

export function useChallengeFunnel(limit = 100) {
  return useQuery({
    queryKey: ["challenge-funnel", limit],
    queryFn: async (): Promise<ChallengeFunnelEvent[]> => {
      const { data, error } = await supabase
        .from("challenge_signup_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as ChallengeFunnelEvent[];
    },
    refetchInterval: 5000,
  });
}

export function useToggleChallengeAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ agentKey, enabled }: { agentKey: string; enabled: boolean }) => {
      const { error } = await supabase
        .from("challenge_agent_state")
        .update({ enabled })
        .eq("agent_key", agentKey);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["challenge-agents"] });
      toast.success("Agent mis à jour");
    },
    onError: (e) => toast.error(`Erreur: ${String(e)}`),
  });
}

export function useRunChallengeAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (agentKey: string) => {
      const { data, error } = await supabase.functions.invoke("challenge-signup-orchestrator", {
        body: { agent: agentKey },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["challenge-agents"] });
      qc.invalidateQueries({ queryKey: ["challenge-funnel"] });
      const r = (data as { result?: { processed?: number } })?.result;
      toast.success(`Agent exécuté — ${r?.processed ?? 0} traités`);
    },
    onError: (e) => toast.error(`Erreur: ${String(e)}`),
  });
}
