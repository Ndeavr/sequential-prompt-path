/**
 * UNPRO — Automation Engine Service
 * Scheduler logic, job queue, throttling, and agent management.
 */
import { supabase } from "@/integrations/supabase/client";

// ─── Types ───────────────────────────────────────────────────────
export type AgentCategory = "trigger" | "build" | "optimization" | "strategic";
export type FrequencyType = "minutes" | "hours" | "daily" | "weekly" | "manual";
export type JobStatus = "queued" | "running" | "completed" | "failed" | "cancelled" | "skipped" | "needs_review";
export type RunStatus = "running" | "completed" | "failed" | "partial";
export type AlertLevel = "info" | "warning" | "critical";

export interface AutomationAgent {
  id: string;
  key: string;
  name: string;
  description: string | null;
  category: AgentCategory;
  is_enabled: boolean;
  frequency_type: FrequencyType;
  frequency_value: number;
  cron_expression: string | null;
  timezone: string;
  priority: number;
  max_jobs_per_run: number;
  max_jobs_per_day: number;
  quality_threshold: number;
  duplicate_similarity_threshold: number;
  min_data_confidence: number;
  requires_manual_review: boolean;
  run_if_queue_not_empty_only: boolean;
  config: Record<string, unknown>;
  last_run_at: string | null;
  next_run_at: string | null;
  last_status: string | null;
  created_at: string;
  updated_at: string;
}

export interface AutomationJob {
  id: string;
  agent_id: string;
  job_type: string | null;
  entity_type: string | null;
  entity_id: string | null;
  title: string | null;
  payload: Record<string, unknown>;
  priority: number;
  status: JobStatus;
  scheduled_for: string | null;
  started_at: string | null;
  finished_at: string | null;
  duration_ms: number | null;
  attempts: number;
  max_attempts: number;
  error_message: string | null;
  result_summary: string | null;
  result_payload: Record<string, unknown>;
  source_trigger: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  // joined
  agent?: AutomationAgent;
}

export interface AutomationRun {
  id: string;
  agent_id: string;
  triggered_by: string;
  run_started_at: string | null;
  run_finished_at: string | null;
  status: RunStatus;
  jobs_found: number;
  jobs_executed: number;
  jobs_succeeded: number;
  jobs_failed: number;
  jobs_skipped: number;
  notes: string | null;
  metrics: Record<string, unknown>;
  created_at: string;
  agent?: AutomationAgent;
}

export interface AutomationAlert {
  id: string;
  level: AlertLevel;
  title: string | null;
  message: string | null;
  source: string | null;
  is_read: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface AutomationSetting {
  id: string;
  key: string;
  value: Record<string, unknown>;
  updated_at: string;
}

export interface GeneratedPage {
  id: string;
  page_type: string | null;
  slug: string | null;
  city: string | null;
  category: string | null;
  profession: string | null;
  source_agent_key: string | null;
  status: string | null;
  seo_score: number | null;
  aiseo_score: number | null;
  quality_score: number | null;
  indexed_status: string | null;
  published_at: string | null;
  updated_at: string;
  metadata: Record<string, unknown>;
}

// ─── Fetch helpers ───────────────────────────────────────────────

export async function fetchAgents(): Promise<AutomationAgent[]> {
  const { data, error } = await supabase
    .from("automation_agents")
    .select("*")
    .order("priority", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as AutomationAgent[];
}

export async function fetchJobs(limit = 100, statusFilter?: string): Promise<AutomationJob[]> {
  let q = supabase
    .from("automation_jobs")
    .select("*, agent:automation_agents(key, name, category)")
    .order("priority", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  if (statusFilter && statusFilter !== "all") q = q.eq("status", statusFilter);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as AutomationJob[];
}

export async function fetchRuns(limit = 50): Promise<AutomationRun[]> {
  const { data, error } = await supabase
    .from("automation_runs")
    .select("*, agent:automation_agents(key, name, category)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as AutomationRun[];
}

export async function fetchAlerts(limit = 50): Promise<AutomationAlert[]> {
  const { data, error } = await supabase
    .from("automation_alerts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as AutomationAlert[];
}

export async function fetchSettings(): Promise<AutomationSetting[]> {
  const { data, error } = await supabase
    .from("automation_settings")
    .select("*");
  if (error) throw error;
  return (data ?? []) as unknown as AutomationSetting[];
}

export async function fetchGeneratedPages(limit = 100): Promise<GeneratedPage[]> {
  const { data, error } = await supabase
    .from("generated_pages_registry")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as GeneratedPage[];
}

// ─── Mutations ───────────────────────────────────────────────────

export async function toggleAgent(agentId: string, enabled: boolean) {
  const { error } = await supabase
    .from("automation_agents")
    .update({ is_enabled: enabled })
    .eq("id", agentId);
  if (error) throw error;
}

export async function updateAgentConfig(agentId: string, updates: Partial<AutomationAgent>) {
  const { error } = await supabase
    .from("automation_agents")
    .update(updates as Record<string, unknown>)
    .eq("id", agentId);
  if (error) throw error;
}

export async function triggerManualRun(agentId: string): Promise<AutomationRun> {
  // Create a run record
  const { data, error } = await supabase
    .from("automation_runs")
    .insert({
      agent_id: agentId,
      triggered_by: "manual",
      run_started_at: new Date().toISOString(),
      status: "running",
    })
    .select()
    .single();
  if (error) throw error;
  // Update agent last_run_at
  await supabase
    .from("automation_agents")
    .update({ last_run_at: new Date().toISOString(), last_status: "running" })
    .eq("id", agentId);
  return data as unknown as AutomationRun;
}

export async function updateJobStatus(jobId: string, status: JobStatus, extras?: Record<string, unknown>) {
  const { error } = await supabase
    .from("automation_jobs")
    .update({ status, ...extras })
    .eq("id", jobId);
  if (error) throw error;
}

export async function markAlertRead(alertId: string) {
  const { error } = await supabase
    .from("automation_alerts")
    .update({ is_read: true })
    .eq("id", alertId);
  if (error) throw error;
}

export async function upsertSetting(key: string, value: Record<string, unknown>) {
  const { error } = await supabase
    .from("automation_settings")
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error) throw error;
}

// ─── Stats helpers ───────────────────────────────────────────────

export interface AutomationStats {
  activeAgents: number;
  pausedAgents: number;
  queuedJobs: number;
  runningJobs: number;
  todayCompleted: number;
  todayFailed: number;
  todayPages: number;
  criticalAlerts: number;
}

export async function fetchStats(): Promise<AutomationStats> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString();

  const [agents, queuedJobs, runningJobs, todayJobs, alerts, todayPages] = await Promise.all([
    supabase.from("automation_agents").select("id, is_enabled"),
    supabase.from("automation_jobs").select("id", { count: "exact", head: true }).eq("status", "queued"),
    supabase.from("automation_jobs").select("id", { count: "exact", head: true }).eq("status", "running"),
    supabase.from("automation_jobs").select("status").gte("created_at", todayStr).in("status", ["completed", "failed"]),
    supabase.from("automation_alerts").select("id", { count: "exact", head: true }).eq("level", "critical").eq("is_read", false),
    supabase.from("generated_pages_registry").select("id", { count: "exact", head: true }).gte("published_at", todayStr),
  ]);

  const agentList = (agents.data ?? []) as Array<{ id: string; is_enabled: boolean }>;
  const jobList = (todayJobs.data ?? []) as Array<{ status: string }>;

  return {
    activeAgents: agentList.filter(a => a.is_enabled).length,
    pausedAgents: agentList.filter(a => !a.is_enabled).length,
    queuedJobs: queuedJobs.count ?? 0,
    runningJobs: runningJobs.count ?? 0,
    todayCompleted: jobList.filter(j => j.status === "completed").length,
    todayFailed: jobList.filter(j => j.status === "failed").length,
    todayPages: todayPages.count ?? 0,
    criticalAlerts: alerts.count ?? 0,
  };
}

// ─── Prompt export helper ────────────────────────────────────────

export function generatePromptExport(job: AutomationJob): string {
  return `# Build Prompt — ${job.title ?? job.job_type}

## Contexte
- Agent: ${(job.agent as any)?.name ?? "N/A"}
- Type: ${job.job_type}
- Entité: ${job.entity_type} / ${job.entity_id}
- Priorité: ${job.priority}

## Données disponibles
\`\`\`json
${JSON.stringify(job.payload, null, 2)}
\`\`\`

## Build demandé
Générer le contenu selon les spécifications du module "${job.job_type}".

## Critères d'acceptation
- Qualité minimale: score >= 0.7
- Pas de duplication (similarity < 0.9)
- Données vérifiées avec confidence >= 0.6
- Format structuré JSON prêt à insérer en base
`;
}
