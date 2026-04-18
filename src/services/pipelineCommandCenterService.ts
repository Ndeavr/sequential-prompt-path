/**
 * UNPRO — Pipeline Command Center Service
 * Couche live unifiée par-dessus l'engine outbound existant.
 * Lit les vues SQL et les RPCs créées dans Lot 1 + Lot 2-5.
 */
import { supabase } from "@/integrations/supabase/client";

// ─── Types ──────────────────────────────────────────────────────

export type RunNormalizedStatus =
  | "queued" | "running" | "blocked" | "failed"
  | "succeeded" | "partial_success" | "cancelled" | "unknown";

export type DependencyStatus = "healthy" | "degraded" | "failed" | "unknown";

export type AgentHealthStatus =
  | "healthy" | "degraded" | "stale" | "failing"
  | "disabled" | "never_ran" | "unknown";

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

export interface PipelineRunTransition {
  id: string;
  run_id: string;
  from_stage: string | null;
  to_stage: string | null;
  transition_status: string | null;
  message: string | null;
  payload: any;
  created_at: string;
}

export interface PipelineRunDetail {
  run: any & {
    duration_seconds: number;
    normalized_status: RunNormalizedStatus;
  };
  transitions: PipelineRunTransition[];
  blockers: PipelineOpenBlocker[];
  generated_at: string;
}

export interface PipelineAgentLive {
  id: string;
  agent_key: string;
  agent_name: string;
  agent_type: string | null;
  is_enabled: boolean;
  last_status: string | null;
  last_run_at: string | null;
  next_run_at: string | null;
  error_streak: number;
  priority: number | null;
  health_status: AgentHealthStatus;
  seconds_since_last_run: number;
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

export async function fetchPipelineRunDetail(runId: string): Promise<PipelineRunDetail> {
  const { data, error } = await supabase.rpc("rpc_pipeline_get_run_details" as any, { p_run_id: runId });
  if (error) throw error;
  return data as unknown as PipelineRunDetail;
}

export async function fetchPipelineAgentsLive(): Promise<PipelineAgentLive[]> {
  const { data, error } = await supabase
    .from("v_pipeline_agents_live" as any)
    .select("*")
    .order("priority", { ascending: false, nullsFirst: false });
  if (error) throw error;
  return (data ?? []) as unknown as PipelineAgentLive[];
}

export async function fetchAllOpenBlockers(limit = 200): Promise<PipelineOpenBlocker[]> {
  const { data, error } = await supabase
    .from("automation_blockers" as any)
    .select("id, blocker_key, engine_name, severity_level, blocker_type, blocker_title, blocker_message, suggested_resolution, retry_possible, run_id, detected_at, status")
    .neq("status", "resolved")
    .order("detected_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as PipelineOpenBlocker[];
}

// ─── Mutations ──────────────────────────────────────────────────

export async function resolveBlocker(blockerId: string, note?: string) {
  const { data, error } = await supabase.rpc("rpc_pipeline_resolve_blocker" as any, {
    p_blocker_id: blockerId,
    p_note: note ?? null,
  });
  if (error) throw error;
  return data as { success?: boolean; error?: string };
}

export async function retryRun(runId: string) {
  const { data, error } = await supabase.rpc("rpc_pipeline_retry_run" as any, { p_run_id: runId });
  if (error) throw error;
  return data as { success?: boolean; error?: string };
}
