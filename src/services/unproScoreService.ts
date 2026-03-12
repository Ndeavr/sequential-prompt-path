/**
 * UNPRO — UNPRO Score Service
 * Computes the platform trust/reliability score for contractors.
 * Separate from AIPP (which measures profile indexability).
 */

// ─── Types ───

export interface UNPROScoreInput {
  // Operational reliability (20%)
  appointment_show_rate: number;      // 0-1
  response_time_avg_hours: number;    // lower = better
  cancellation_rate: number;          // 0-1

  // Client satisfaction (20%)
  avg_rating: number;                 // 0-5
  review_count: number;
  review_sentiment_score: number;     // 0-100

  // Compliance (15%)
  verification_status: string;
  has_license: boolean;
  has_insurance: boolean;
  documents_count: number;

  // Profile quality (10%)
  profile_completeness: number;       // 0-100

  // Experience relevance (10%)
  years_experience: number;
  specialty_match?: boolean;

  // Internal performance (15%)
  quote_submission_rate: number;      // 0-1
  close_rate: number;                 // 0-1
  complaint_rate: number;             // 0-1

  // Transparency (10%)
  has_portfolio: boolean;
  has_website: boolean;
  has_description: boolean;

  // Optional RAS factor
  review_reliability_factor?: number; // 0-1
}

export interface UNPROScoreResult {
  score: number;                      // 0-100
  grade: string;
  components: {
    operational_reliability: number;
    client_satisfaction: number;
    compliance: number;
    profile_quality: number;
    experience_relevance: number;
    internal_performance: number;
    transparency_trust: number;
  };
}

// ─── Weights ───

const WEIGHTS = {
  operational_reliability: 0.20,
  client_satisfaction: 0.20,
  compliance: 0.15,
  profile_quality: 0.10,
  experience_relevance: 0.10,
  internal_performance: 0.15,
  transparency_trust: 0.10,
} as const;

// ─── Helpers ───

function clamp(v: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, v));
}

function rateToScore(rate: number, ideal: number, weight = 100): number {
  return clamp((rate / ideal) * weight);
}

// ─── Core Computation ───

export function computeUNPROScore(input: UNPROScoreInput): UNPROScoreResult {
  const rrf = input.review_reliability_factor ?? 1;

  // 1. Operational reliability
  const showScore = clamp(input.appointment_show_rate * 100);
  const responseScore = clamp(100 - Math.min(input.response_time_avg_hours, 48) * (100 / 48));
  const cancelPenalty = clamp(100 - input.cancellation_rate * 200);
  const operational = (showScore * 0.4 + responseScore * 0.3 + cancelPenalty * 0.3);

  // 2. Client satisfaction (weighted by RAS)
  const ratingScore = clamp((input.avg_rating / 5) * 100);
  const reviewVolume = clamp(Math.min(input.review_count, 30) / 30 * 100);
  const sentiment = clamp(input.review_sentiment_score);
  const satisfaction = (ratingScore * 0.4 + reviewVolume * 0.3 + sentiment * 0.3) * rrf;

  // 3. Compliance
  let compliance = 0;
  if (input.verification_status === "verified") compliance += 35;
  else if (input.verification_status === "pending") compliance += 10;
  if (input.has_license) compliance += 25;
  if (input.has_insurance) compliance += 25;
  compliance += Math.min(input.documents_count, 5) * 3;
  compliance = clamp(compliance);

  // 4. Profile quality
  const profile = clamp(input.profile_completeness);

  // 5. Experience relevance
  const yearsScore = clamp(Math.min(input.years_experience, 20) / 20 * 80 + (input.specialty_match ? 20 : 0));

  // 6. Internal performance
  const quoteRate = clamp(input.quote_submission_rate * 100);
  const closeRate = clamp(input.close_rate * 100);
  const complaintPenalty = clamp(100 - input.complaint_rate * 300);
  const performance = (quoteRate * 0.3 + closeRate * 0.4 + complaintPenalty * 0.3);

  // 7. Transparency
  let transparency = 0;
  if (input.has_portfolio) transparency += 35;
  if (input.has_website) transparency += 30;
  if (input.has_description) transparency += 35;
  transparency = clamp(transparency);

  const components = {
    operational_reliability: Math.round(operational),
    client_satisfaction: Math.round(satisfaction),
    compliance: Math.round(compliance),
    profile_quality: Math.round(profile),
    experience_relevance: Math.round(yearsScore),
    internal_performance: Math.round(performance),
    transparency_trust: Math.round(transparency),
  };

  const score = Math.round(
    components.operational_reliability * WEIGHTS.operational_reliability +
    components.client_satisfaction * WEIGHTS.client_satisfaction +
    components.compliance * WEIGHTS.compliance +
    components.profile_quality * WEIGHTS.profile_quality +
    components.experience_relevance * WEIGHTS.experience_relevance +
    components.internal_performance * WEIGHTS.internal_performance +
    components.transparency_trust * WEIGHTS.transparency_trust
  );

  const grade =
    score >= 85 ? "Elite" :
    score >= 70 ? "Excellent" :
    score >= 55 ? "Bon" :
    score >= 40 ? "Moyen" :
    "Faible";

  return { score: clamp(score), grade, components };
}
