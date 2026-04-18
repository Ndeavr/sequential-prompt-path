/**
 * UNPRO — Pipeline Command Center Hook (Realtime)
 * Combine TanStack Query + Supabase Realtime sur les tables clés.
 */
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchPipelineLiveOverview, fetchPipelineRuns,
  type PipelineLiveOverview, type PipelineLiveRun,
} from "@/services/pipelineCommandCenterService";

const KEY_OVERVIEW = ["pipeline-cc-overview"];
const KEY_RUNS = ["pipeline-cc-runs"];

export function usePipelineLiveOverview() {
  const qc = useQueryClient();

  const query = useQuery<PipelineLiveOverview>({
    queryKey: KEY_OVERVIEW,
    queryFn: fetchPipelineLiveOverview,
    staleTime: 10_000,
    refetchInterval: 30_000, // fallback polling si realtime tombe
  });

  // Realtime — invalide l'overview à chaque mutation des tables clés
  useEffect(() => {
    const channel = supabase
      .channel("pipeline-cc-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "outbound_autopilot_runs" },
        () => qc.invalidateQueries({ queryKey: KEY_OVERVIEW }))
      .on("postgres_changes", { event: "*", schema: "public", table: "automation_blockers" },
        () => qc.invalidateQueries({ queryKey: KEY_OVERVIEW }))
      .on("postgres_changes", { event: "*", schema: "public", table: "automation_agents" },
        () => qc.invalidateQueries({ queryKey: KEY_OVERVIEW }))
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [qc]);

  return query;
}

export function usePipelineRuns(limit = 100) {
  return useQuery<PipelineLiveRun[]>({
    queryKey: [...KEY_RUNS, limit],
    queryFn: () => fetchPipelineRuns(limit),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}
