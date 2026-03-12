import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useValidationRuns() {
  return useQuery({
    queryKey: ["validation-runs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("validation_runs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });
}

export function useValidationFindings(runId: string | null) {
  return useQuery({
    queryKey: ["validation-findings", runId],
    enabled: !!runId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("validation_findings")
        .select("*")
        .eq("run_id", runId!)
        .order("business_impact_score", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function usePageScores(runId: string | null) {
  return useQuery({
    queryKey: ["page-scores", runId],
    enabled: !!runId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("page_scores")
        .select("*")
        .eq("run_id", runId!)
        .order("overall_score", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export function useImprovementTasks(runId?: string | null) {
  return useQuery({
    queryKey: ["improvement-tasks", runId],
    queryFn: async () => {
      let q = supabase.from("improvement_tasks").select("*").order("priority", { ascending: true });
      if (runId) q = q.eq("run_id", runId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useLaunchValidation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("validation-orchestrator", {
        body: { action: "launch" },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["validation-runs"] });
    },
  });
}

export function useResolveFind() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (findingId: string) => {
      const { data, error } = await supabase.functions.invoke("validation-orchestrator", {
        body: { action: "resolve", finding_id: findingId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["validation-findings"] });
    },
  });
}

export function useUpdateTaskStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("improvement_tasks").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["improvement-tasks"] });
    },
  });
}
