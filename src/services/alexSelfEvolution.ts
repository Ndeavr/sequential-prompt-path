/**
 * AlexSelfEvolution — Self-learning and optimization system.
 * Logs interactions, evaluates decisions, detects patterns, runs experiments.
 * Safety: never increase response length, never increase aggressiveness early,
 * never break core UX. All improvements are subtle, measurable, reversible.
 */

import { supabase } from "@/integrations/supabase/client";

// ─── Types ───

export interface InteractionLog {
  userId?: string;
  role?: string;
  context?: Record<string, unknown>;
  alexText: string;
  userResponse?: string;
  actionTaken?: string;
  success?: boolean;
  conversionType?: string;
  timeToActionMs?: number;
  frictionDetected?: boolean;
  emotionalState?: string;
  sessionId?: string;
  page?: string;
}

export interface DecisionScore {
  efficiency: number;   // 0-1
  clarity: number;      // 0-1
  conversion: number;   // 0-1
  satisfaction: number; // 0-1
  overall: number;      // 0-1
}

export interface LearningInsight {
  patternKey: string;
  description: string;
  improvement: string;
  confidence: number;
}

export interface ExperimentResult {
  experimentKey: string;
  winner: "a" | "b" | null;
  confidence: number;
}

// ─── 1. Performance Analyzer (Logging) ───

export async function logInteraction(log: InteractionLog): Promise<void> {
  try {
    await supabase.from("alex_interactions").insert({
      user_id: log.userId,
      role: log.role,
      context: log.context as any,
      alex_text: log.alexText,
      user_response: log.userResponse,
      action_taken: log.actionTaken,
      success: log.success,
      conversion_type: log.conversionType,
      time_to_action_ms: log.timeToActionMs,
      friction_detected: log.frictionDetected ?? false,
      emotional_state: log.emotionalState,
      session_id: log.sessionId,
      page: log.page,
    });
  } catch {
    // Silent — never block UX for logging
  }
}

// ─── 2. Decision Evaluator ───

export function evaluateDecision(interaction: InteractionLog): DecisionScore {
  let efficiency = 0.5;
  let clarity = 0.5;
  let conversion = 0;
  let satisfaction = 0.5;

  // Did user act?
  if (interaction.actionTaken) efficiency += 0.3;
  if (interaction.success) { efficiency += 0.2; conversion = 1; }

  // Was response short enough? (clarity proxy)
  const wordCount = (interaction.alexText || "").split(/\s+/).length;
  if (wordCount <= 25) clarity += 0.3;
  else if (wordCount <= 40) clarity += 0.1;
  else clarity -= 0.2; // too long

  // Speed of action
  if (interaction.timeToActionMs && interaction.timeToActionMs < 5000) efficiency += 0.1;

  // Friction = negative signal
  if (interaction.frictionDetected) { satisfaction -= 0.3; efficiency -= 0.1; }

  // Emotional state
  if (interaction.emotionalState === "confident") satisfaction += 0.2;
  if (interaction.emotionalState === "stressed") satisfaction -= 0.1;

  const overall = Math.max(0, Math.min(1,
    efficiency * 0.3 + clarity * 0.25 + conversion * 0.3 + satisfaction * 0.15
  ));

  return {
    efficiency: clamp01(efficiency),
    clarity: clamp01(clarity),
    conversion: clamp01(conversion),
    satisfaction: clamp01(satisfaction),
    overall: clamp01(overall),
  };
}

// ─── 3. Learning Engine ───

const patternBuffer: Map<string, { count: number; successCount: number }> = new Map();

export function recordPattern(key: string, success: boolean): void {
  const existing = patternBuffer.get(key) || { count: 0, successCount: 0 };
  existing.count++;
  if (success) existing.successCount++;
  patternBuffer.set(key, existing);
}

export function detectInsights(): LearningInsight[] {
  const insights: LearningInsight[] = [];

  for (const [key, data] of patternBuffer.entries()) {
    if (data.count < 10) continue; // need minimum data

    const successRate = data.successCount / data.count;

    if (successRate > 0.75) {
      insights.push({
        patternKey: key,
        description: `Pattern "${key}" has ${Math.round(successRate * 100)}% success rate`,
        improvement: "Increase weight for this pattern",
        confidence: Math.min(0.95, successRate),
      });
    }

    if (successRate < 0.25 && data.count >= 20) {
      insights.push({
        patternKey: key,
        description: `Pattern "${key}" has low ${Math.round(successRate * 100)}% success`,
        improvement: "Reduce or replace this pattern",
        confidence: Math.min(0.9, 1 - successRate),
      });
    }
  }

  return insights;
}

export async function persistInsights(insights: LearningInsight[]): Promise<void> {
  if (insights.length === 0) return;
  try {
    await supabase.from("alex_learning_memory").insert(
      insights.map(i => ({
        pattern_key: i.patternKey,
        pattern_description: i.description,
        improvement: i.improvement,
        confidence: i.confidence,
        applied: false,
        reversible: true,
      }))
    );
  } catch { /* silent */ }
}

// ─── 4. Response Optimizer ───

/** Safety-bounded text optimization */
export function optimizeResponse(text: string): string {
  let optimized = text;

  // SAFETY: never increase length
  const words = optimized.split(/\s+/);
  if (words.length > 40) {
    // Truncate to ~30 words, keeping complete sentences
    const sentences = optimized.split(/[.!?]+/).filter(Boolean);
    optimized = sentences.slice(0, 3).join(". ").trim();
    if (!optimized.endsWith(".") && !optimized.endsWith("?") && !optimized.endsWith("!")) {
      optimized += ".";
    }
  }

  // Remove corporate artifacts
  const corporatePatterns = [
    /\bAfin de\b/gi,
    /\bDans le but de\b/gi,
    /\bN'hésitez pas\b/gi,
    /\bJe me permets de\b/gi,
  ];
  for (const pattern of corporatePatterns) {
    optimized = optimized.replace(pattern, "Pour");
  }

  return optimized;
}

// ─── 5. Experiment Engine ───

export interface ActiveExperiment {
  key: string;
  variantA: string;
  variantB: string;
}

const activeExperiments: Map<string, ActiveExperiment> = new Map();

export function getExperimentVariant(experimentKey: string): "a" | "b" {
  // Simple 50/50 split
  return Math.random() < 0.5 ? "a" : "b";
}

export async function recordExperimentResult(
  experimentKey: string,
  variant: "a" | "b",
  converted: boolean
): Promise<void> {
  try {
    const field = variant === "a"
      ? converted ? "variant_a_conversions" : "variant_a_impressions"
      : converted ? "variant_b_conversions" : "variant_b_impressions";

    // Increment — use RPC or direct update
    const { data } = await supabase
      .from("alex_experiments")
      .select("id, variant_a_conversions, variant_a_impressions, variant_b_conversions, variant_b_impressions")
      .eq("experiment_key", experimentKey)
      .eq("is_active", true)
      .maybeSingle();

    if (!data) return;

    const update: Record<string, number> = {};
    if (variant === "a") {
      update.variant_a_impressions = (data.variant_a_impressions || 0) + 1;
      if (converted) update.variant_a_conversions = (data.variant_a_conversions || 0) + 1;
    } else {
      update.variant_b_impressions = (data.variant_b_impressions || 0) + 1;
      if (converted) update.variant_b_conversions = (data.variant_b_conversions || 0) + 1;
    }

    await supabase.from("alex_experiments").update(update).eq("id", data.id);

    // Auto-evaluate winner at 100+ impressions each
    const aImp = variant === "a" ? (update.variant_a_impressions ?? data.variant_a_impressions ?? 0) : (data.variant_a_impressions ?? 0);
    const bImp = variant === "b" ? (update.variant_b_impressions ?? data.variant_b_impressions ?? 0) : (data.variant_b_impressions ?? 0);

    if (aImp >= 100 && bImp >= 100) {
      const aRate = (data.variant_a_conversions || 0) / Math.max(1, aImp);
      const bRate = (data.variant_b_conversions || 0) / Math.max(1, bImp);
      const diff = Math.abs(aRate - bRate);

      if (diff > 0.05) { // 5% minimum difference
        const winner = aRate > bRate ? "a" : "b";
        const confidence = Math.min(0.95, 0.5 + diff * 5);
        await supabase.from("alex_experiments").update({
          winner,
          confidence,
          is_active: false,
          ended_at: new Date().toISOString(),
        }).eq("id", data.id);
      }
    }
  } catch { /* silent */ }
}

// ─── 6. Conversion Tracker ───

export async function trackConversion(
  userId: string,
  conversionType: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    await supabase.from("alex_performance_metrics").insert({
      metric_type: "conversion",
      metric_value: 1,
      segment: conversionType,
      metadata: metadata as any,
    });
  } catch { /* silent */ }
}

// ─── 7. Insight Generator ───

export async function generateInsights(): Promise<{
  topConverting: string[];
  blockers: string[];
  recommendations: string[];
}> {
  try {
    // Get recent interactions
    const { data: interactions } = await supabase
      .from("alex_interactions")
      .select("action_taken, success, friction_detected, page")
      .gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString())
      .limit(500);

    if (!interactions || interactions.length === 0) {
      return { topConverting: [], blockers: [], recommendations: [] };
    }

    // Analyze
    const actionSuccess: Record<string, { total: number; success: number }> = {};
    const frictionPages: Record<string, number> = {};

    for (const i of interactions) {
      if (i.action_taken) {
        const a = actionSuccess[i.action_taken] || { total: 0, success: 0 };
        a.total++;
        if (i.success) a.success++;
        actionSuccess[i.action_taken] = a;
      }
      if (i.friction_detected && i.page) {
        frictionPages[i.page] = (frictionPages[i.page] || 0) + 1;
      }
    }

    const topConverting = Object.entries(actionSuccess)
      .filter(([_, v]) => v.total >= 5)
      .sort((a, b) => (b[1].success / b[1].total) - (a[1].success / a[1].total))
      .slice(0, 3)
      .map(([k, v]) => `${k}: ${Math.round((v.success / v.total) * 100)}%`);

    const blockers = Object.entries(frictionPages)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([page, count]) => `${page}: ${count} friction events`);

    const recommendations: string[] = [];
    if (blockers.length > 0) recommendations.push("Simplifier les flows avec friction élevée");
    if (topConverting.length > 0) recommendations.push("Renforcer les patterns qui convertissent");

    return { topConverting, blockers, recommendations };
  } catch {
    return { topConverting: [], blockers: [], recommendations: [] };
  }
}

// ─── 8. Behavior Tuner ───

/** Get learned tuning parameters for a given context */
export async function getTuning(role: string): Promise<{
  maxSentences: number;
  pushLevel: "gentle" | "moderate" | "direct";
  preferredActionOrder: string[];
}> {
  // Check learned patterns
  try {
    const { data } = await supabase
      .from("alex_learning_memory")
      .select("pattern_key, improvement, confidence")
      .eq("applied", true)
      .gte("confidence", 0.6)
      .order("confidence", { ascending: false })
      .limit(10);

    // Default safe tuning
    const tuning = {
      maxSentences: 3,
      pushLevel: "gentle" as const,
      preferredActionOrder: role === "contractor"
        ? ["show_score", "show_plan_recommendation", "open_booking"]
        : ["open_upload", "show_score", "open_booking"],
    };

    // Apply learned adjustments (subtle only)
    if (data) {
      for (const d of data) {
        if (d.pattern_key === "shorter_responses" && d.confidence > 0.7) {
          tuning.maxSentences = 2;
        }
        if (d.pattern_key === "direct_push_works" && d.confidence > 0.8) {
          tuning.pushLevel = "moderate";
        }
      }
    }

    return tuning;
  } catch {
    return {
      maxSentences: 3,
      pushLevel: "gentle",
      preferredActionOrder: ["open_upload", "show_score", "open_booking"],
    };
  }
}

// ─── Helpers ───

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}
