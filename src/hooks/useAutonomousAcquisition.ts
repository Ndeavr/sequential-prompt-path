import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface PipelineInput {
  business_name: string;
  domain?: string;
  city?: string;
  category?: string;
}

interface PipelineStep {
  step: string;
  status: "success" | "error";
  data?: unknown;
  error?: string;
}

interface PipelineResult {
  success: boolean;
  lead_id?: string;
  aipp_score?: number;
  landing_url?: string;
  steps: PipelineStep[];
  error?: string;
}

interface AcquisitionStatus {
  tasks: any[];
  logs: any[];
  stats: { total_leads: number; enriched: number };
}

export function useAutonomousAcquisition() {
  const qc = useQueryClient();
  const [lastResult, setLastResult] = useState<PipelineResult | null>(null);

  const status = useQuery<AcquisitionStatus>({
    queryKey: ["autonomous-acquisition-status"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("autonomous-acquisition-engine", {
        body: { action: "check_status" },
      });
      if (error) throw error;
      return data;
    },
    refetchInterval: 10000,
  });

  const runPipeline = useMutation({
    mutationFn: async (input: PipelineInput) => {
      const { data, error } = await supabase.functions.invoke("autonomous-acquisition-engine", {
        body: { action: "run_pipeline", ...input },
      });
      if (error) throw error;
      return data as PipelineResult;
    },
    onSuccess: (data) => {
      setLastResult(data);
      qc.invalidateQueries({ queryKey: ["autonomous-acquisition-status"] });
    },
  });

  const retryFailed = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("autonomous-acquisition-engine", {
        body: { action: "retry_failed" },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["autonomous-acquisition-status"] }),
  });

  // Realtime subscription for enriched profiles
  const subscribeRealtime = useCallback(() => {
    const channel = supabase
      .channel("acquisition-live")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "contractor_enriched_profiles",
      }, () => {
        qc.invalidateQueries({ queryKey: ["autonomous-acquisition-status"] });
      })
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "agent_tasks",
        filter: "agent_name=eq.autonomous-acquisition",
      }, () => {
        qc.invalidateQueries({ queryKey: ["autonomous-acquisition-status"] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [qc]);

  return {
    status: status.data,
    isLoading: status.isLoading,
    lastResult,
    runPipeline,
    retryFailed,
    subscribeRealtime,
  };
}
