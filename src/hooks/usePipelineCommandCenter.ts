/**
 * UNPRO — Pipeline Command Center Hooks (Realtime)
 * TanStack Query + Supabase Realtime sur les tables clés.
 */
import { useEffect } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchPipelineLiveOverview, fetchPipelineRuns, fetchPipelineRunDetail,
  fetchPipelineAgentsLive, fetchAllOpenBlockers,
  resolveBlocker, retryRun,
  type PipelineLiveOverview, type PipelineLiveRun, type PipelineRunDetail,
  type PipelineAgentLive, type PipelineOpenBlocker,
} from "@/services/pipelineCommandCenterService";

const KEY_OVERVIEW = ["pipeline-cc-overview"];
const KEY_RUNS = ["pipeline-cc-runs"];
const KEY_RUN_DETAIL = (id: string) => ["pipeline-cc-run-detail", id];
const KEY_AGENTS = ["pipeline-cc-agents"];
const KEY_BLOCKERS = ["pipeline-cc-blockers"];

/** Realtime helper — bind invalidation aux changements des 3 tables clés */
function useRealtimeInvalidate(invalidateKeys: (string | (string | number)[])[][]) {
  const qc = useQueryClient();
  useEffect(() => {
    const channel = supabase
      .channel(`pipeline-cc-rt-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "outbound_autopilot_runs" },
        () => invalidateKeys.forEach(k => qc.invalidateQueries({ queryKey: k as any })))
      .on("postgres_changes", { event: "*", schema: "public", table: "automation_blockers" },
        () => invalidateKeys.forEach(k => qc.invalidateQueries({ queryKey: k as any })))
      .on("postgres_changes", { event: "*", schema: "public", table: "automation_agents" },
        () => invalidateKeys.forEach(k => qc.invalidateQueries({ queryKey: k as any })))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

export function usePipelineLiveOverview() {
  useRealtimeInvalidate([KEY_OVERVIEW]);
  return useQuery<PipelineLiveOverview>({
    queryKey: KEY_OVERVIEW,
    queryFn: fetchPipelineLiveOverview,
    staleTime: 10_000,
    refetchInterval: 30_000,
  });
}

export function usePipelineRuns(limit = 100) {
  return useQuery<PipelineLiveRun[]>({
    queryKey: [...KEY_RUNS, limit],
    queryFn: () => fetchPipelineRuns(limit),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}

export function usePipelineRunDetail(runId: string | undefined) {
  useRealtimeInvalidate(runId ? [KEY_RUN_DETAIL(runId)] : []);
  return useQuery<PipelineRunDetail>({
    queryKey: KEY_RUN_DETAIL(runId ?? ""),
    queryFn: () => fetchPipelineRunDetail(runId!),
    enabled: !!runId,
    staleTime: 5_000,
    refetchInterval: 15_000,
  });
}

export function usePipelineAgentsLive() {
  useRealtimeInvalidate([KEY_AGENTS]);
  return useQuery<PipelineAgentLive[]>({
    queryKey: KEY_AGENTS,
    queryFn: fetchPipelineAgentsLive,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}

export function useOpenBlockers(limit = 200) {
  useRealtimeInvalidate([KEY_BLOCKERS, KEY_OVERVIEW]);
  return useQuery<PipelineOpenBlocker[]>({
    queryKey: [...KEY_BLOCKERS, limit],
    queryFn: () => fetchAllOpenBlockers(limit),
    staleTime: 10_000,
    refetchInterval: 30_000,
  });
}

export function useResolveBlocker() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) => resolveBlocker(id, note),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY_BLOCKERS });
      qc.invalidateQueries({ queryKey: KEY_OVERVIEW });
    },
  });
}

export function useRetryRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (runId: string) => retryRun(runId),
    onSuccess: (_d, runId) => {
      qc.invalidateQueries({ queryKey: KEY_OVERVIEW });
      qc.invalidateQueries({ queryKey: KEY_RUNS });
      qc.invalidateQueries({ queryKey: KEY_RUN_DETAIL(runId) });
    },
  });
}
