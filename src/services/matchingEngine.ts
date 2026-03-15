/**
 * UNPRO — Matching Engine Core
 * Calculates URS (UNPRO Recommendation Score), success probability, and conflict risk.
 * Delegates CCAI computation to ccaiEngine, RAS to reviewAuthenticityService.
 */

import type {
  MatchEvaluation,
  MatchExplanations,
} from "@/types/matching";

// Re-export scoring functions from dedicated services
export { computeCCAI, buildCCAIEngineOutput, getCCAILabelFr } from "./ccaiEngine";
export { computeRAS, computeWeightedReviewFit } from "./reviewAuthenticityService";
export { computeUNPROScore } from "./unproScoreService";

// ─── URS Weights ───
const URS_WEIGHTS = {
  project_fit: 0.22,
  property_fit: 0.15,
  ccai: 0.13,
  dna_fit: 0.10,
  unpro_score: 0.15,
  aipp_score: 0.10,
  availability: 0.05,
  budget_fit: 0.05,
  weighted_review_fit: 0.05,
};

// ─── AIPP Match Score (authenticity-weighted) ───
export function computeAIPPMatchScore(input: {
  identity_consistency: number;
  authority_presence: number;
  reviews_reputation: number;
  profile_richness: number;
  visual_proofs: number;
  topical_expertise: number;
  structured_readability: number;
  freshness_activity: number;
  review_reliability_factor?: number;
}): number {
  const rrf = input.review_reliability_factor ?? 1;
  const adjusted_reviews = input.reviews_reputation * rrf;

  return Math.round(
    (input.identity_consistency * 0.15 +
      input.authority_presence * 0.15 +
      adjusted_reviews * 0.20 +
      input.profile_richness * 0.15 +
      input.visual_proofs * 0.10 +
      input.topical_expertise * 0.10 +
      input.structured_readability * 0.10 +
      input.freshness_activity * 0.05) *
      100
  ) / 100;
}

// ─── URS (Unified Recommendation Score) ───
export function computeURS(scores: {
  project_fit: number;
  property_fit: number;
  ccai: number;
  dna_fit: number;
  unpro_score: number;
  aipp_score: number;
  availability: number;
  budget_fit: number;
  weighted_review_fit: number;
  risk_modifier: number;
}): number {
  const base =
    scores.project_fit * URS_WEIGHTS.project_fit +
    scores.property_fit * URS_WEIGHTS.property_fit +
    scores.ccai * URS_WEIGHTS.ccai +
    scores.dna_fit * URS_WEIGHTS.dna_fit +
    scores.unpro_score * URS_WEIGHTS.unpro_score +
    scores.aipp_score * URS_WEIGHTS.aipp_score +
    scores.availability * URS_WEIGHTS.availability +
    scores.budget_fit * URS_WEIGHTS.budget_fit +
    scores.weighted_review_fit * URS_WEIGHTS.weighted_review_fit;

  return Math.max(0, Math.min(100, Math.round((base + scores.risk_modifier) * 100) / 100));
}

// ─── Success Probability ───
export function computeSuccessProbability(match: {
  recommendation_score: number;
  ccai_score: number;
  dna_fit_score: number;
  unpro_score: number;
  budget_fit_score: number;
  conflict_risk: number;
}): number {
  const base =
    match.recommendation_score * 0.30 +
    match.ccai_score * 0.20 +
    match.dna_fit_score * 0.10 +
    match.unpro_score * 0.20 +
    match.budget_fit_score * 0.10;

  const riskPenalty = match.conflict_risk * 0.10;
  return Math.max(0, Math.min(100, Math.round((base - riskPenalty) * 100) / 100));
}

// ─── Conflict Risk ───
export function computeConflictRisk(input: {
  ccai_score: number;
  dna_fit_score: number;
  budget_fit_score: number;
  cleanliness_mismatch: boolean;
  communication_mismatch: boolean;
  complaint_rate: number;
  review_authenticity_low: boolean;
}): { score: number; drivers: string[] } {
  let risk = 0;
  const drivers: string[] = [];

  if (input.ccai_score < 40) { risk += 20; drivers.push("weak_alignment"); }
  else if (input.ccai_score < 60) { risk += 10; drivers.push("moderate_alignment"); }

  if (input.dna_fit_score < 40) { risk += 15; drivers.push("behavioral_mismatch"); }
  if (input.budget_fit_score < 50) { risk += 15; drivers.push("budget_tension"); }
  if (input.cleanliness_mismatch) { risk += 10; drivers.push("cleanliness_friction"); }
  if (input.communication_mismatch) { risk += 10; drivers.push("communication_gap"); }
  if (input.complaint_rate > 0.15) { risk += 15; drivers.push("complaint_history"); }
  if (input.review_authenticity_low) { risk += 5; drivers.push("low_review_confidence"); }

  return { score: Math.min(100, risk), drivers };
}

// ─── Explanation Generator ───
// Trust signals add context but never replace fit/relevance explanations
export function generateExplanations(match: Partial<MatchEvaluation>): MatchExplanations {
  const top_reasons: MatchExplanations["top_reasons"] = [];
  const watchouts: MatchExplanations["watchouts"] = [];

  if ((match.project_fit_score ?? 0) >= 80)
    top_reasons.push({ text_fr: "Excellente expérience sur ce type de projet", text_en: "Excellent experience on this project type", icon: "wrench" });
  if ((match.ccai_score ?? 0) >= 75)
    top_reasons.push({ text_fr: "Style de communication aligné", text_en: "Communication style aligned", icon: "message-circle" });
  if ((match.unpro_score_snapshot ?? 0) >= 80)
    top_reasons.push({ text_fr: "Fiabilité opérationnelle élevée", text_en: "High operational reliability", icon: "shield-check" });
  if ((match.dna_fit_score ?? 0) >= 75)
    top_reasons.push({ text_fr: "Compatibilité comportementale forte", text_en: "Strong behavioral compatibility", icon: "heart" });
  if ((match.budget_fit_score ?? 0) >= 80)
    top_reasons.push({ text_fr: "Budget bien aligné", text_en: "Budget well aligned", icon: "dollar-sign" });

  // Trust-based explanation — informative, never overstated
  if ((match as any).admin_verified === true)
    top_reasons.push({ text_fr: "Profil validé par l'équipe UnPRO", text_en: "Profile validated by UnPRO team", icon: "shield-check" });

  if ((match.conflict_risk_score ?? 0) >= 40)
    watchouts.push({ text_fr: "Risque de friction modéré", text_en: "Moderate friction risk", icon: "alert-triangle" });
  if ((match.budget_fit_score ?? 0) < 50)
    watchouts.push({ text_fr: "Budget potentiellement serré", text_en: "Budget may be tight", icon: "alert-circle" });
  if ((match.ccai_score ?? 0) < 50)
    watchouts.push({ text_fr: "Différences de style de travail", text_en: "Work style differences", icon: "shuffle" });

  return {
    top_reasons: top_reasons.slice(0, 4),
    watchouts: watchouts.slice(0, 3),
    review_highlights: [],
    conflict_drivers: [],
  };
}
