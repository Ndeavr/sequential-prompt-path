import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function usePipelineHealth() {
  return useQuery({
    queryKey: ["pipeline-health-latest"],
    queryFn: async () => {
      const { data } = await supabase
        .from("pipeline_health_snapshots")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });
}

export function useVerificationRuns(limit = 10) {
  return useQuery({
    queryKey: ["verification-runs", limit],
    queryFn: async () => {
      const { data } = await supabase
        .from("pipeline_verification_runs")
        .select("*, pipeline_verification_steps(*)")
        .order("created_at", { ascending: false })
        .limit(limit);
      return data || [];
    },
  });
}

export function useManualTestScenarios() {
  return useQuery({
    queryKey: ["manual-test-scenarios"],
    queryFn: async () => {
      const { data } = await supabase
        .from("manual_test_scenarios")
        .select("*")
        .eq("is_active", true)
        .order("test_type");
      return data || [];
    },
  });
}

export function useManualTestRuns(limit = 20) {
  return useQuery({
    queryKey: ["manual-test-runs", limit],
    queryFn: async () => {
      const { data } = await supabase
        .from("manual_test_runs")
        .select("*, manual_test_scenarios(scenario_key, scenario_label)")
        .order("created_at", { ascending: false })
        .limit(limit);
      return data || [];
    },
  });
}

export function useAutomationJobs(limit = 20) {
  return useQuery({
    queryKey: ["automation-jobs-ops", limit],
    queryFn: async () => {
      const { data } = await supabase
        .from("automation_jobs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      return (data || []) as any[];
    },
  });
}

export function useAutomationSchedules() {
  return useQuery({
    queryKey: ["automation-schedules"],
    queryFn: async () => {
      const { data } = await supabase
        .from("automation_schedules")
        .select("*")
        .order("automation_type");
      return data || [];
    },
  });
}

export function usePipelineLogs(limit = 50, filters?: { source_module?: string; status?: string }) {
  return useQuery({
    queryKey: ["pipeline-logs", limit, filters],
    queryFn: async () => {
      let q = supabase.from("pipeline_logs").select("*").order("created_at", { ascending: false }).limit(limit);
      if (filters?.source_module) q = q.eq("source_module", filters.source_module);
      if (filters?.status) q = q.eq("status", filters.status);
      const { data } = await q;
      return data || [];
    },
  });
}
