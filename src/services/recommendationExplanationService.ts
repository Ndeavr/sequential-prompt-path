/**
 * Persist per-match compatibility explanations into `recommendation_explanations`.
 * Fire-and-forget; never blocks UI. Idempotent via (user_id, contractor_id) upsert.
 */
import { supabase } from "@/integrations/supabase/client";
import type { MatchEvaluation } from "@/types/matching";

export interface RecommendationExplanationRow {
  match_id: string;
  user_id: string;
  contractor_id: string;
  overall_match_score: number;
  project_compatibility: number;
  budget_compatibility: number;
  region_compatibility: number;
  availability_compatibility: number;
  communication_compatibility: number;
  performance_verified: boolean;
  blockers: string[];
  explanation_summary: string;
}

export function buildExplanationRow(match: MatchEvaluation, userId: string): RecommendationExplanationRow {
  const blockers = (match.explanations?.watchouts ?? []).map((w) => w.text_fr).filter(Boolean);
  const summary = (match.explanations?.top_reasons ?? [])
    .slice(0, 3)
    .map((r) => r.text_fr)
    .join(" · ");
  return {
    match_id: match.id,
    user_id: userId,
    contractor_id: match.contractor_id,
    overall_match_score: match.recommendation_score ?? 0,
    project_compatibility: match.project_fit_score ?? 0,
    budget_compatibility: match.budget_fit_score ?? 0,
    region_compatibility: match.property_fit_score ?? 0,
    availability_compatibility: match.availability_score ?? 0,
    communication_compatibility: match.ccai_score ?? 0,
    performance_verified: (match.unpro_score_snapshot ?? 0) >= 75,
    blockers,
    explanation_summary: summary,
  };
}

export async function persistRecommendationExplanation(match: MatchEvaluation, userId: string): Promise<void> {
  try {
    const row = buildExplanationRow(match, userId);
    await (supabase as any)
      .from("recommendation_explanations")
      .upsert(row, { onConflict: "user_id,contractor_id" });
  } catch (err) {
    console.warn("[recommendation_explanations] persist failed (non-blocking)", err);
  }
}

export async function persistBatchExplanations(matches: MatchEvaluation[], userId: string): Promise<void> {
  if (!userId || matches.length === 0) return;
  try {
    const rows = matches.map((m) => buildExplanationRow(m, userId));
    await (supabase as any)
      .from("recommendation_explanations")
      .upsert(rows, { onConflict: "user_id,contractor_id" });
  } catch (err) {
    console.warn("[recommendation_explanations] batch persist failed (non-blocking)", err);
  }
}

export async function fetchExplanation(
  userId: string,
  contractorId: string
): Promise<RecommendationExplanationRow | null> {
  try {
    const { data, error } = await (supabase as any)
      .from("recommendation_explanations")
      .select("*")
      .eq("user_id", userId)
      .eq("contractor_id", contractorId)
      .maybeSingle();
    if (error) throw error;
    return (data ?? null) as RecommendationExplanationRow | null;
  } catch (err) {
    console.warn("[recommendation_explanations] fetch failed", err);
    return null;
  }
}
