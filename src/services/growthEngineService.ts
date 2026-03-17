/**
 * UNPRO — Autonomous Growth Engine Service
 * Client-side API for the growth flywheel dashboard.
 */
import { supabase } from "@/integrations/supabase/client";

// ─── Types ───────────────────────────────────────────────────────
export interface GrowthEvent {
  id: string;
  event_type: string;
  source_engine: string;
  entity_type: string | null;
  entity_id: string | null;
  title: string | null;
  description: string | null;
  metadata: Record<string, unknown>;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface GrowthMetric {
  id: string;
  metric_date: string;
  metric_type: string;
  metric_value: number;
  dimension_key: string | null;
  dimension_value: string | null;
}

export interface FlywheelStage {
  key: string;
  label: string;
  count: number;
}

export interface EngineStatus {
  key: string;
  name: string;
  is_enabled: boolean;
  last_run_at: string | null;
  next_run_at: string | null;
  last_status: string | null;
  category: string;
}

export interface GrowthDashboard {
  stats: Record<string, number>;
  eventCounts: Record<string, number>;
  recentEvents: GrowthEvent[];
  pendingEvents: GrowthEvent[];
  engines: EngineStatus[];
}

// ─── API Calls ───────────────────────────────────────────────────
async function invokeGrowthEngine(action: string, params: Record<string, unknown> = {}) {
  const { data, error } = await supabase.functions.invoke("autonomous-growth-engine", {
    body: { action, ...params },
  });
  if (error) throw error;
  return data;
}

export const fetchGrowthDashboard = (): Promise<GrowthDashboard> =>
  invokeGrowthEngine("get_dashboard");

export const fetchFlywheelStatus = (): Promise<{ stages: FlywheelStage[] }> =>
  invokeGrowthEngine("get_flywheel_status");

export const triggerContentExpansion = (limit = 20) =>
  invokeGrowthEngine("expand_content", { limit });

export const triggerCityExpansion = () =>
  invokeGrowthEngine("expand_cities");

export const triggerTransformationDiscovery = () =>
  invokeGrowthEngine("discover_transformations");

export const triggerTrafficAnalysis = () =>
  invokeGrowthEngine("analyze_traffic");

export const triggerTransformationPromotion = () =>
  invokeGrowthEngine("promote_transformations");

export const approveGrowthEvent = (eventId: string, userId: string) =>
  invokeGrowthEngine("approve_event", { event_id: eventId, user_id: userId });

export const rejectGrowthEvent = (eventId: string, userId: string) =>
  invokeGrowthEngine("reject_event", { event_id: eventId, user_id: userId });

// ─── Direct DB queries for real-time dashboard ──────────────────
export async function fetchRecentGrowthEvents(limit = 30): Promise<GrowthEvent[]> {
  const { data, error } = await supabase
    .from("growth_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as GrowthEvent[];
}

export async function fetchPendingGrowthEvents(): Promise<GrowthEvent[]> {
  const { data, error } = await supabase
    .from("growth_events")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as GrowthEvent[];
}

export async function fetchGrowthMetrics(days = 30): Promise<GrowthMetric[]> {
  const since = new Date(Date.now() - days * 86400000).toISOString().split("T")[0];
  const { data, error } = await supabase
    .from("growth_engine_metrics")
    .select("*")
    .gte("metric_date", since)
    .order("metric_date", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as GrowthMetric[];
}
