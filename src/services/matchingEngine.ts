/**
 * UNPRO — Matching Engine Core
 * Calculates URS (UNPRO Recommendation Score), success probability, and conflict risk.
 */

import type {
  MatchEvaluation,
  MatchExplanations,
  CCAIResult,
  CCAIInsight,
  DNATraits,
  DNAFitResult,
  AlignmentAnswer,
} from "@/types/matching";

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

// ─── CCAI ───
const CCAI_LABELS: Record<string, { en: string; fr: string }> = {
  strong: { en: "Strong Alignment", fr: "Alignement fort" },
  good: { en: "Good Fit", fr: "Bonne compatibilité" },
  caution: { en: "Caution", fr: "Prudence" },
  mismatch: { en: "Misalignment", fr: "Désalignement" },
};

export function computeCCAI(
  homeownerAnswers: AlignmentAnswer[],
  contractorAnswers: AlignmentAnswer[],
  questionCategories: Record<string, string>
): CCAIResult {
  const hoMap = new Map(homeownerAnswers.map((a) => [a.question_id, a.answer_code]));
  const coMap = new Map(contractorAnswers.map((a) => [a.question_id, a.answer_code]));

  const matched: string[] = [];
  const mismatched: string[] = [];

  for (const [qId, hoAnswer] of hoMap) {
    const coAnswer = coMap.get(qId);
    if (!coAnswer) continue;
    if (hoAnswer === coAnswer) matched.push(qId);
    else mismatched.push(qId);
  }

  const total = matched.length + mismatched.length;
  const score = matched.length;
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;

  let labelKey = "mismatch";
  if (score >= 21) labelKey = "strong";
  else if (score >= 15) labelKey = "good";
  else if (score >= 10) labelKey = "caution";

  const insights: CCAIInsight[] = [];

  // Group mismatches by category for insight generation
  const categoryMismatches = new Map<string, number>();
  for (const qId of mismatched) {
    const cat = questionCategories[qId] ?? "unknown";
    categoryMismatches.set(cat, (categoryMismatches.get(cat) ?? 0) + 1);
  }

  for (const [cat, count] of categoryMismatches) {
    if (count >= 2) {
      insights.push({
        type: "friction",
        category: cat,
        message_fr: `Friction possible sur ${cat.replace(/_/g, " ")}`,
        message_en: `Possible friction on ${cat.replace(/_/g, " ")}`,
      });
    }
  }

  const categoryMatches = new Map<string, number>();
  for (const qId of matched) {
    const cat = questionCategories[qId] ?? "unknown";
    categoryMatches.set(cat, (categoryMatches.get(cat) ?? 0) + 1);
  }
  for (const [cat, count] of categoryMatches) {
    if (count >= 3) {
      insights.push({
        type: "aligned",
        category: cat,
        message_fr: `Bonne entente sur ${cat.replace(/_/g, " ")}`,
        message_en: `Good alignment on ${cat.replace(/_/g, " ")}`,
      });
    }
  }

  return {
    score,
    percentage: pct,
    label: CCAI_LABELS[labelKey].en,
    label_fr: CCAI_LABELS[labelKey].fr,
    matchedQuestions: matched,
    mismatchedQuestions: mismatched,
    insights,
  };
}

// ─── DNA Fit ───
export function computeDNAFitLegacy(
  homeowner: DNATraits,
  contractor: DNATraits
): DNAFitResult {
  const dimensions = Object.keys(homeowner) as (keyof DNATraits)[];
  let totalDiff = 0;
  const complementary: string[] = [];
  const friction: string[] = [];

  for (const dim of dimensions) {
    const diff = Math.abs((homeowner[dim] ?? 50) - (contractor[dim] ?? 50));
    totalDiff += diff;
    if (diff <= 15) complementary.push(dim);
    else if (diff >= 40) friction.push(dim);
  }

  const maxDiff = dimensions.length * 100;
  const score = Math.round((1 - totalDiff / maxDiff) * 100);
  const clamped = Math.max(0, Math.min(100, score));

  let compatibility_label: DNAFitResult["compatibility_label"] = "low";
  if (clamped >= 85) compatibility_label = "very_high";
  else if (clamped >= 72) compatibility_label = "high";
  else if (clamped >= 58) compatibility_label = "moderate";

  return {
    score: clamped,
    dna_fit_score: clamped,
    compatibility_label,
    homeowner_type: "unknown",
    contractor_type: "unknown",
    complementary_traits: complementary,
    friction_traits: friction,
    matching_traits_fr: [],
    watchout_traits_fr: [],
    explanation_fr: "",
  };
}

// ─── Review Authenticity Score (RAS) ───
export function computeRAS(input: {
  temporal_authenticity: number;
  reviewer_credibility: number;
  linguistic_authenticity: number;
  contextual_specificity: number;
  rating_distribution_integrity: number;
  cross_platform_consistency: number;
  recency_continuity_quality: number;
}): { ras: number; fake_review_risk: number; reliability_factor: number } {
  const ras =
    input.temporal_authenticity * 0.15 +
    input.reviewer_credibility * 0.20 +
    input.linguistic_authenticity * 0.20 +
    input.contextual_specificity * 0.15 +
    input.rating_distribution_integrity * 0.10 +
    input.cross_platform_consistency * 0.10 +
    input.recency_continuity_quality * 0.10;

  return {
    ras: Math.round(ras * 100) / 100,
    fake_review_risk: Math.round((100 - ras) * 100) / 100,
    reliability_factor: Math.round((ras / 100) * 1000) / 1000,
  };
}

// ─── UNPRO Score ───
export function computeUNPROScore(input: {
  operational_reliability: number;
  client_satisfaction: number;
  compliance: number;
  profile_quality: number;
  experience_relevance: number;
  internal_performance: number;
  transparency_trust: number;
}): number {
  return Math.round(
    (input.operational_reliability * 0.20 +
      input.client_satisfaction * 0.20 +
      input.compliance * 0.15 +
      input.profile_quality * 0.10 +
      input.experience_relevance * 0.10 +
      input.internal_performance * 0.15 +
      input.transparency_trust * 0.10) *
      100
  ) / 100;
}

// ─── AIPP Score ───
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
