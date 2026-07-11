import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type AuditMode = "simulation" | "stripe_test" | "production_no_send" | "production_live";

export interface AuditStep {
  step_key: string;
  step_label: string;
  status: "success" | "warning" | "failed" | "blocked" | "skipped";
  started_at: string;
  completed_at: string;
  duration_ms: number;
  record_id: string | null;
  error_code: string | null;
  error_message: string | null;
  metadata: Record<string, unknown>;
}

export interface AuditRunResult {
  run_id: string;
  mode: AuditMode;
  allow_live_delivery: boolean;
  total_steps: number;
  success_count: number;
  failure_count: number;
  funnel: Record<string, number>;
  steps: AuditStep[];
}

export interface FunnelCounts {
  scraped: number;
  contactable: number;
  outreach_queued: number;
  sent: number;
  delivered: number;
  clicked: number;
  onboarding_started: number;
  onboarding_completed: number;
  payment_started: number;
  paid: number;
  activated: number;
  recommendable: number;
}

export interface PipelineError {
  id: string;
  category: string;
  error_code: string;
  error_message: string;
  entity_type: string | null;
  entity_id: string | null;
  step_key: string | null;
  first_seen_at: string;
  last_seen_at: string;
  occurrences: number;
  status: string;
  repair_attempts: number;
  last_repair_result: string | null;
  recommended_action: string | null;
  repair_function: string | null;
  metadata: Record<string, unknown>;
}

export function useFunnelCounts() {
  return useQuery<FunnelCounts>({
    queryKey: ["pipeline-funnel-counts"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("v_pipeline_funnel_counts")
        .select("*")
        .maybeSingle();
      if (error) throw error;
      return (data ?? {}) as FunnelCounts;
    },
    refetchInterval: 20_000,
  });
}

export function useLatestAuditRun() {
  return useQuery({
    queryKey: ["pipeline-audit-latest"],
    queryFn: async () => {
      const { data: run } = await (supabase as any)
        .from("pipeline_verification_runs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!run) return null;
      const { data: steps } = await (supabase as any)
        .from("pipeline_verification_steps")
        .select("*")
        .eq("verification_run_id", run.id)
        .order("step_key", { ascending: true });
      return { run, steps: steps ?? [] };
    },
    refetchInterval: 15_000,
  });
}

export function useRunPipelineAudit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { mode: AuditMode; allow_live_delivery?: boolean }) => {
      const { data, error } = await supabase.functions.invoke("audit-contractor-acquisition-pipeline", {
        body: args,
      });
      if (error) throw error;
      return data as AuditRunResult;
    },
    onSuccess: (data) => {
      toast.success(`Audit terminé — ${data.success_count}/${data.total_steps} OK`);
      qc.invalidateQueries({ queryKey: ["pipeline-audit-latest"] });
      qc.invalidateQueries({ queryKey: ["pipeline-funnel-counts"] });
      qc.invalidateQueries({ queryKey: ["pipeline-errors"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erreur audit"),
  });
}

export function usePipelineErrors(status: string = "open") {
  return useQuery<PipelineError[]>({
    queryKey: ["pipeline-errors", status],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("acquisition_pipeline_errors")
        .select("*")
        .eq("status", status)
        .order("last_seen_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as PipelineError[];
    },
    refetchInterval: 20_000,
  });
}

export function useUpdatePipelineError() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "acknowledged" | "repaired" | "ignored" }) => {
      const { error } = await (supabase as any)
        .from("acquisition_pipeline_errors")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pipeline-errors"] }),
  });
}
