/**
 * UNPRO — Founder Command Center data layer.
 * Two founder action classes: APPROVALS and CALLS. Everything else is read-only health.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export interface FounderApproval {
  id: string;
  kind: string;
  title: string;
  proposed_change: Record<string, unknown>;
  reason: string | null;
  evidence: Record<string, unknown>;
  expected_impact: string | null;
  risk_level: string | null;
  rollback_plan: string | null;
  status: string;
  proposed_by_agent: string | null;
  target_key: string | null;
  version: number;
  created_at: string;
}

export interface FounderCallTask {
  id: string;
  business_name: string | null;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  service_category: string | null;
  priority_score: number | null;
  reason: string | null;
  context: Record<string, unknown>;
  suggested_script: string | null;
  objective: string | null;
  status: string;
  next_action: string | null;
  created_at: string;
}

export interface TacticPerformance {
  tactic_key: string;
  channel: string | null;
  variant: string | null;
  service_category: string | null;
  city: string | null;
  attempts: number;
  delivered: number;
  clicked: number;
  signups: number;
  activations: number;
  activation_rate: number | null;
}

export const usePendingApprovals = () =>
  useQuery({
    queryKey: ["founder-approvals", "pending"],
    queryFn: async (): Promise<FounderApproval[]> => {
      const { data, error } = await supabase
        .from("founder_approvals" as never)
        .select("*")
        .in("status", ["pending", "modified"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as FounderApproval[];
    },
    refetchInterval: 30_000,
  });

export const useCallTasks = () =>
  useQuery({
    queryKey: ["founder-call-tasks"],
    queryFn: async (): Promise<FounderCallTask[]> => {
      const { data, error } = await supabase
        .from("founder_call_tasks" as never)
        .select("*")
        .in("status", ["queued", "callback"])
        .order("priority_score", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as unknown as FounderCallTask[];
    },
    refetchInterval: 60_000,
  });

export const useTacticPerformance = () =>
  useQuery({
    queryKey: ["tactic-performance"],
    queryFn: async (): Promise<TacticPerformance[]> => {
      const { data, error } = await supabase
        .from("v_tactic_performance" as never)
        .select("*")
        .limit(20);
      if (error) throw error;
      return (data ?? []) as unknown as TacticPerformance[];
    },
    refetchInterval: 120_000,
  });

/** Only blockers that genuinely need a human — routine failures self-repair. */
export const useExceptionalBlockers = () =>
  useQuery({
    queryKey: ["founder-exceptional-blockers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("automation_blockers" as never)
        .select("id, blocker_title, blocker_message, engine_name, severity_level, detected_at, suggested_resolution")
        .eq("status", "open")
        .in("severity_level", ["high", "critical"])
        .order("detected_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as unknown as Array<{
        id: string; blocker_title: string; blocker_message: string | null;
        engine_name: string | null; severity_level: string; detected_at: string;
        suggested_resolution: string | null;
      }>;
    },
    refetchInterval: 60_000,
  });

export const useAutonomyActivity = () =>
  useQuery({
    queryKey: ["autonomy-activity"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agent_logs" as never)
        .select("id, agent_name, log_type, message, created_at")
        .order("created_at", { ascending: false })
        .limit(25);
      if (error) throw error;
      return (data ?? []) as unknown as Array<{
        id: string; agent_name: string | null; log_type: string | null;
        message: string | null; created_at: string;
      }>;
    },
    refetchInterval: 30_000,
  });

export const useApprovalDecision = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: {
      approval_id: string;
      decision: "approve" | "reject" | "modify";
      modified_change?: Record<string, unknown>;
      note?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("founder-approval-execute", { body: vars });
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["founder-approvals"] });
      toast.success(
        v.decision === "approve" ? "Approuvé — exécution automatique lancée"
          : v.decision === "reject" ? "Rejeté"
          : "Modification enregistrée",
      );
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Décision impossible"),
  });
};

export const useRecordCallOutcome = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: string; status: string; outcome_note?: string }) => {
      const { error } = await supabase
        .from("founder_call_tasks" as never)
        .update({
          status: vars.status,
          outcome_note: vars.outcome_note ?? null,
          called_at: new Date().toISOString(),
        } as never)
        .eq("id", vars.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["founder-call-tasks"] });
      toast.success("Appel enregistré");
    },
    onError: () => toast.error("Enregistrement impossible"),
  });
};

export const useRefreshCallQueue = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("founder-call-queue", { body: {} });
      if (error) throw error;
      return data as { inserted?: number };
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["founder-call-tasks"] });
      toast.success(`${d?.inserted ?? 0} appels ajoutés`);
    },
    onError: () => toast.error("Rafraîchissement impossible"),
  });
};
