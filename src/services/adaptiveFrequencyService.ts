/**
 * UNPRO — Adaptive Frequency Service
 * Dynamic cadence adjustment based on cluster opportunity scoring.
 */
import { supabase } from "@/integrations/supabase/client";

export interface AdaptiveFrequencyScore {
  id: string;
  cluster_key: string;
  cluster_type: string;
  city: string | null;
  category: string | null;
  profession: string | null;
  demand_score: number;
  supply_score: number;
  profitability_score: number;
  content_quality_score: number;
  seo_potential_score: number;
  opportunity_score: number;
  frequency_multiplier: number;
  recommended_action: string | null;
  agent_key: string | null;
  is_active: boolean;
  computed_at: string;
  metadata: Record<string, unknown>;
}

export type RecommendedAction =
  | "accelerate"
  | "maintain"
  | "decelerate"
  | "pause"
  | "prioritize";

// ─── Fetch ───────────────────────────────────────────────────────

export async function fetchAdaptiveScores(limit = 100): Promise<AdaptiveFrequencyScore[]> {
  const { data, error } = await supabase
    .from("adaptive_frequency_scores")
    .select("*")
    .eq("is_active", true)
    .order("opportunity_score", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as AdaptiveFrequencyScore[];
}

// ─── Compute frequency multiplier from opportunity score ────────

export function computeFrequencyMultiplier(opportunityScore: number, errorStreak: number): number {
  // Auto-pause on high error streak
  if (errorStreak >= 5) return 0;

  // Score 0-100 scale
  if (opportunityScore >= 85) return 2.0;   // Double frequency
  if (opportunityScore >= 70) return 1.5;
  if (opportunityScore >= 50) return 1.0;   // Normal
  if (opportunityScore >= 30) return 0.7;
  if (opportunityScore >= 15) return 0.5;   // Half frequency
  return 0.25;                               // Quarter frequency
}

export function deriveRecommendedAction(
  opportunityScore: number,
  errorStreak: number,
  contentQuality: number
): RecommendedAction {
  if (errorStreak >= 5) return "pause";
  if (opportunityScore >= 80 && contentQuality >= 60) return "accelerate";
  if (opportunityScore >= 80 && contentQuality < 60) return "prioritize";
  if (opportunityScore < 30) return "decelerate";
  return "maintain";
}

export function getActionLabel(action: string): string {
  const map: Record<string, string> = {
    accelerate: "Accélérer la cadence",
    maintain: "Maintenir le rythme",
    decelerate: "Ralentir la cadence",
    pause: "Pause automatique",
    prioritize: "Prioriser le contenu",
  };
  return map[action] ?? action;
}

export function getActionColor(action: string): string {
  const map: Record<string, string> = {
    accelerate: "text-emerald-500",
    maintain: "text-blue-500",
    decelerate: "text-amber-500",
    pause: "text-destructive",
    prioritize: "text-purple-500",
  };
  return map[action] ?? "text-muted-foreground";
}

export function getMultiplierBadgeClass(m: number): string {
  if (m >= 1.5) return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
  if (m >= 1.0) return "bg-blue-500/10 text-blue-600 border-blue-500/20";
  if (m >= 0.5) return "bg-amber-500/10 text-amber-600 border-amber-500/20";
  if (m > 0) return "bg-orange-500/10 text-orange-600 border-orange-500/20";
  return "bg-destructive/10 text-destructive border-destructive/20";
}

// ─── Upsert a score ─────────────────────────────────────────────

export async function upsertAdaptiveScore(
  clusterKey: string,
  scores: {
    demand_score: number;
    supply_score: number;
    profitability_score: number;
    content_quality_score: number;
    seo_potential_score: number;
    city?: string;
    category?: string;
    profession?: string;
    agent_key?: string;
  }
) {
  const opportunityScore =
    scores.demand_score * 0.25 +
    scores.supply_score * 0.15 +
    scores.profitability_score * 0.25 +
    scores.content_quality_score * 0.15 +
    scores.seo_potential_score * 0.20;

  const multiplier = computeFrequencyMultiplier(opportunityScore, 0);
  const action = deriveRecommendedAction(opportunityScore, 0, scores.content_quality_score);

  const { error } = await supabase
    .from("adaptive_frequency_scores")
    .upsert(
      {
        cluster_key: clusterKey,
        ...scores,
        frequency_multiplier: multiplier,
        recommended_action: action,
        computed_at: new Date().toISOString(),
      } as any,
      { onConflict: "cluster_key" }
    );
  if (error) throw error;
}

// ─── Apply adaptive frequency to an agent ───────────────────────

export async function applyAdaptiveFrequency(agentId: string, multiplier: number) {
  const { data: agent, error: fetchErr } = await supabase
    .from("automation_agents")
    .select("frequency_value, base_frequency_value, adaptive_frequency_enabled")
    .eq("id", agentId)
    .single();
  if (fetchErr) throw fetchErr;

  const a = agent as any;
  const base = a.base_frequency_value ?? a.frequency_value;
  const adjusted = Math.max(1, Math.round(base / multiplier));

  const { error } = await supabase
    .from("automation_agents")
    .update({
      base_frequency_value: base,
      frequency_value: adjusted,
      current_frequency_multiplier: multiplier,
      adaptive_frequency_enabled: true,
    } as any)
    .eq("id", agentId);
  if (error) throw error;
}
