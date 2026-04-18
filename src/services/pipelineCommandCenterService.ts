/**
 * UNPRO — Pipeline Command Center Service
 * Couche live unifiée par-dessus l'engine outbound existant.
 * Lit les vues SQL et la RPC créées dans le Lot 1.
 */
import { supabase } from "@/integrations/supabase/client";

// ─── Types ──────────────────────────────────────────────────────

export type RunNormalizedStatus =
  | "queued" | "running" | "blocked" | "failed"
  | "succeeded" | "partial_success" | "cancelled" | "unknown";

export type DependencyStatus = "healthy" | "degraded" | "failed" | "unknown";

export interface PipelineLiveRun {
  id: string;
  campaign_id: string | null;
  run_status: string;
  normalized_status: RunNormalizedStatus;
  current_stage: string | null;
  started_at: string | null;
  last_transition_at: string | null;
  duration_seconds: number;
  open_blockers_count: number;
  transitions_count: number;
}

export interface PipelineOpenBlocker {
  id: string;
  blocker_key: string;
  engine_name: string;
  severity_level: string;
  blocker_type: string;
  blocker_title: string;
  blocker_message: string | null;
  suggested_resolution: string | null;
  retry_possible: boolean;
  run_id: string | null;
  detected_at: string;
}

export interface PipelineDependency {
  dependency_key: string;
  dependency_name: string;
  status: DependencyStatus;
  open_blockers: number;
  incidents_24h: number;
  last_failure_at: string | null;
  last_success_at: string | null;
  avg_latency_ms: number | null;
}

export interface PipelineStageMetric {
  stage_key: string;
  queued_count: number;
  running_count: number;
  success_count: number;
  failed_count: number;
  blocked_count: number;
  total_count: number;
  last_activity_at: string | null;
}

export interface PipelineLiveOverview {
  kpis: {
    active_runs: number;
    succeeded_24h: number;
    failed_24h: number;
    blocked_items: number;
    critical_blockers: number;
    avg_run_duration_seconds: number;
  };
  active_runs: PipelineLiveRun[];
  open_blockers: PipelineOpenBlocker[];
  dependencies: PipelineDependency[];
  stage_metrics: PipelineStageMetric[];
  generated_at: string;
}

// ─── Fetchers ───────────────────────────────────────────────────

export async function fetchPipelineLiveOverview(): Promise<PipelineLiveOverview> {
  const { data, error } = await supabase.rpc("rpc_pipeline_get_live_overview" as any);
  if (error) throw error;
  return data as unknown as PipelineLiveOverview;
}

export async function fetchPipelineRuns(limit = 100): Promise<PipelineLiveRun[]> {
  const { data, error } = await supabase
    .from("v_pipeline_runs_live" as any)
    .select("*")
    .order("started_at", { ascending: false, nullsFirst: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as PipelineLiveRun[];
}
