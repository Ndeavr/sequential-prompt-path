/**
 * UNPRO — Review Authenticity Service
 * Computes Review Authenticity Score (RAS) from 7 dimensions.
 * Determines review reliability factor for weighting in matching.
 */

// ─── Types ───

export interface RASInput {
  temporal_authenticity: number;     // 0-100: review timing patterns
  reviewer_credibility: number;      // 0-100: reviewer profile quality
  linguistic_authenticity: number;   // 0-100: language naturalness
  contextual_specificity: number;    // 0-100: detail specificity
  rating_distribution_integrity: number; // 0-100: rating spread health
  cross_platform_consistency: number;    // 0-100: multi-source alignment
  recency_continuity_quality: number;    // 0-100: review freshness
}

export interface RASResult {
  ras: number;                    // 0-100
  fake_review_risk: number;       // 0-100 (internal only)
  reliability_factor: number;     // 0-1
  confidence_label: "high" | "moderate" | "low";
  dimension_scores: RASInput;
}

export interface WeightedReviewResult {
  raw_review_fit: number;
  weighted_review_fit: number;
  reliability_factor: number;
  confidence_label: "high" | "moderate" | "low";
}

// ─── Weights ───

const RAS_WEIGHTS = {
  temporal_authenticity: 0.15,
  reviewer_credibility: 0.20,
  linguistic_authenticity: 0.20,
  contextual_specificity: 0.15,
  rating_distribution_integrity: 0.10,
  cross_platform_consistency: 0.10,
  recency_continuity_quality: 0.10,
} as const;

// ─── Core Computation ───

export function computeRAS(input: RASInput): RASResult {
  const ras =
    input.temporal_authenticity * RAS_WEIGHTS.temporal_authenticity +
    input.reviewer_credibility * RAS_WEIGHTS.reviewer_credibility +
    input.linguistic_authenticity * RAS_WEIGHTS.linguistic_authenticity +
    input.contextual_specificity * RAS_WEIGHTS.contextual_specificity +
    input.rating_distribution_integrity * RAS_WEIGHTS.rating_distribution_integrity +
    input.cross_platform_consistency * RAS_WEIGHTS.cross_platform_consistency +
    input.recency_continuity_quality * RAS_WEIGHTS.recency_continuity_quality;

  const clamped = Math.max(0, Math.min(100, Math.round(ras * 100) / 100));
  const reliability_factor = Math.round((clamped / 100) * 1000) / 1000;

  let confidence_label: RASResult["confidence_label"];
  if (clamped >= 75) confidence_label = "high";
  else if (clamped >= 50) confidence_label = "moderate";
  else confidence_label = "low";

  return {
    ras: clamped,
    fake_review_risk: Math.round((100 - clamped) * 100) / 100,
    reliability_factor,
    confidence_label,
    dimension_scores: input,
  };
}

/**
 * Apply RAS to raw review fit to get weighted review fit.
 */
export function computeWeightedReviewFit(
  rawReviewFit: number,
  rasResult: RASResult
): WeightedReviewResult {
  return {
    raw_review_fit: rawReviewFit,
    weighted_review_fit: Math.round(rawReviewFit * rasResult.reliability_factor * 100) / 100,
    reliability_factor: rasResult.reliability_factor,
    confidence_label: rasResult.confidence_label,
  };
}

/**
 * Estimate RAS from available review metadata.
 * Used when full 7-dimension data isn't available.
 */
export function estimateRASFromMetadata(input: {
  review_count: number;
  avg_rating: number;
  rating_std_dev?: number;
  oldest_review_days?: number;
  newest_review_days?: number;
  has_text_reviews_pct?: number;
  avg_text_length?: number;
  platform_count?: number;
}): RASInput {
  // Temporal: penalize burst patterns, reward steady flow
  const reviewAge = input.oldest_review_days ?? 365;
  const reviewSpread = Math.min(100, (reviewAge / 730) * 100);
  const temporal = Math.min(100, reviewSpread * 0.7 + (input.review_count > 3 ? 30 : input.review_count * 10));

  // Reviewer credibility: based on review count and text presence
  const textPct = input.has_text_reviews_pct ?? 50;
  const reviewer = Math.min(100, (Math.min(input.review_count, 20) / 20) * 60 + textPct * 0.4);

  // Linguistic: text length as proxy
  const avgLen = input.avg_text_length ?? 50;
  const linguistic = Math.min(100, (Math.min(avgLen, 200) / 200) * 80 + (textPct > 60 ? 20 : 0));

  // Contextual specificity: longer texts = more specific
  const contextual = Math.min(100, (Math.min(avgLen, 150) / 150) * 100);

  // Rating distribution: penalize perfect scores
  const stdDev = input.rating_std_dev ?? 0.5;
  const ratingIntegrity = input.avg_rating === 5 && input.review_count > 5
    ? 40
    : Math.min(100, 60 + stdDev * 40);

  // Cross-platform
  const platforms = input.platform_count ?? 1;
  const crossPlatform = Math.min(100, platforms * 35);

  // Recency
  const newest = input.newest_review_days ?? 30;
  const recency = newest <= 30 ? 100 : newest <= 90 ? 80 : newest <= 180 ? 60 : 40;

  return {
    temporal_authenticity: Math.round(temporal),
    reviewer_credibility: Math.round(reviewer),
    linguistic_authenticity: Math.round(linguistic),
    contextual_specificity: Math.round(contextual),
    rating_distribution_integrity: Math.round(ratingIntegrity),
    cross_platform_consistency: Math.round(crossPlatform),
    recency_continuity_quality: Math.round(recency),
  };
}
