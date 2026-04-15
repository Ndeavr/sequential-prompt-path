/**
 * UNPRO — Automation Command Center Service
 * Extended service for blockers, action logs, dashboard metrics, and workflows.
 */
import { supabase } from "@/integrations/supabase/client";

// ─── Types ───────────────────────────────────────────────────────
export interface AutomationBlocker {
  id: string;
  blocker_key: string;
  engine_name: string;
  workflow_id: string | null;
  run_id: string | null;
  job_id: string | null;
  severity_level: string;
  blocker_type: string;
  blocker_title: string;
  blocker_message: string | null;
  suggested_resolution: string | null;
  retry_possible: boolean;
  fallback_available: boolean;
  status: string;
  detected_at: string;
  resolved_at: string | null;
  created_at: string;
}

export interface AutomationWorkflow {
  id: string;
  workflow_key: string;
  workflow_name: string;
  engine_name: string;
  description: string | null;
  trigger_type: string;
  status: string;
  priority_level: number;
  auto_retry_enabled: boolean;
  requires_approval: boolean;
  created_at: string;
}

export interface AutomationRule {
  id: string;
  rule_key: string;
  rule_name: string;
  engine_name: string;
  trigger_condition: Record<string, unknown>;
  action_type: string;
  action_config_json: Record<string, unknown>;
  is_enabled: boolean;
  priority_level: number;
  created_at: string;
}

export interface AutomationActionLog {
  id: string;
  engine_name: string;
  action_type: string;
  action_label: string | null;
  action_message: string | null;
  action_status: string;
  route_target: string | null;
  created_at: string;
}

export interface DashboardMetrics {
  summary: {
    total_jobs_today: number;
    running: number;
    completed: number;
    failed: number;
    queued: number;
    blocked: number;
    critical_blockers: number;
    success_rate: number;
    avg_duration_ms: number;
    active_agents: number;
    total_agents: number;
  };
  hourly_volume: Array<{ hour: number; total: number; succeeded: number; failed: number }>;
  by_engine: Array<{ engine: string; count: number }>;
  failure_reasons: Array<{ type: string; count: number }>;
  recent_actions: AutomationActionLog[];
}

// ─── Fetchers ───────────────────────────────────────────────────

export async function fetchBlockers(statusFilter = "open"): Promise<AutomationBlocker[]> {
  let q = supabase
    .from("automation_blockers")
    .select("*")
    .order("severity_level", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(100);
  if (statusFilter !== "all") q = q.eq("status", statusFilter);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as AutomationBlocker[];
}

export async function fetchWorkflows(): Promise<AutomationWorkflow[]> {
  const { data, error } = await supabase
    .from("automation_workflows")
    .select("*")
    .order("priority_level", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as AutomationWorkflow[];
}

export async function fetchAutomationRules(): Promise<AutomationRule[]> {
  const { data, error } = await supabase
    .from("automation_rules")
    .select("*")
    .order("priority_level", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as AutomationRule[];
}

export async function fetchActionLogs(limit = 100): Promise<AutomationActionLog[]> {
  const { data, error } = await supabase
    .from("automation_action_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as AutomationActionLog[];
}

export async function fetchDashboardMetrics(): Promise<DashboardMetrics> {
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const res = await supabase.functions.invoke("fn-load-automation-dashboard-metrics", { body: {} });
  if (res.error) throw res.error;
  return res.data as DashboardMetrics;
}

// ─── Mutations ───────────────────────────────────────────────────

export async function resolveBlocker(blockerId: string, action: "retry" | "ignore" | "resolve") {
  const res = await supabase.functions.invoke("fn-retry-blocked-job", {
    body: { blocker_id: blockerId, action },
  });
  if (res.error) throw res.error;
  return res.data;
}

export async function detectBlockers() {
  const res = await supabase.functions.invoke("fn-detect-automation-blockers", { body: {} });
  if (res.error) throw res.error;
  return res.data;
}

export async function toggleWorkflow(id: string, status: string) {
  const { error } = await supabase
    .from("automation_workflows")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function toggleRule(id: string, enabled: boolean) {
  const { error } = await supabase
    .from("automation_rules")
    .update({ is_enabled: enabled, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}
