/**
 * UNPRO — Matching Engine Types
 */

// ─── Alignment / CCAI ───
export interface AlignmentQuestion {
  id: string;
  code: string;
  category: string;
  question_fr: string;
  question_en: string;
  answer_options: AlignmentOption[];
  weight: number;
  is_active: boolean;
}

export interface AlignmentOption {
  code: string;
  label_fr: string;
  label_en: string;
}

export interface AlignmentAnswer {
  id: string;
  user_id?: string;
  contractor_id?: string;
  property_id?: string;
  question_id: string;
  answer_code: string;
  source: string;
  confidence: number;
}

export interface CCAIResult {
  score: number;
  percentage: number;
  label: string;
  label_fr: string;
  matchedQuestions: string[];
  mismatchedQuestions: string[];
  insights: CCAIInsight[];
}

export interface CCAIInsight {
  type: "aligned" | "friction" | "mismatch";
  category: string;
  message_fr: string;
  message_en: string;
}

// ─── DNA ───
export type HomeownerDNAType =
  | "strategist"
  | "delegator"
  | "budget_guardian"
  | "speed_seeker"
  | "quality_first"
  | "low_friction";

export type ContractorDNAType =
  | "premium_craftsman"
  | "structured_operator"
  | "fast_executor"
  | "technical_specialist"
  | "relationship_builder"
  | "budget_optimizer";

export interface DNATraits {
  involvement: number;
  budgetSensitivity: number;
  speedPriority: number;
  qualityPriority: number;
  communicationDetail: number;
  autonomyPreference: number;
  cleanlinessExpectation: number;
  documentationPreference: number;
  noiseTolerance: number;
  friendlinessPreference: number;
}

export interface DNAProfile {
  id?: string;
  dna_type: string;
  dna_label_fr: string;
  dna_label_en: string;
  traits: DNATraits;
  scores?: Record<string, number>;
  confidence: number;
  generated_by?: string;
}

export interface DNAFitResult {
  score: number;
  dna_fit_score: number;
  compatibility_label: "very_high" | "high" | "moderate" | "low";
  homeowner_type: string;
  contractor_type: string;
  complementary_traits: string[];
  friction_traits: string[];
  matching_traits_fr: string[];
  watchout_traits_fr: string[];
  explanation_fr: string;
}

// ─── Review Intelligence ───
export interface ReviewTheme {
  id: string;
  theme_code: string;
  family_code: string;
  label_fr: string;
  label_en: string;
  description_fr?: string;
  description_en?: string;
  default_weight: number;
  public_visible: boolean;
  matching_relevant: boolean;
}

export interface ReviewDimensionScore {
  dimension_code: string;
  score_raw: number;
  score_weighted: number;
  authenticity_adjusted_score: number;
  mention_count: number;
  positive_count: number;
  negative_count: number;
  confidence_level: string;
  summary_fr?: string;
  summary_en?: string;
}

export interface ReviewInsight {
  overall_sentiment_score: number;
  review_intelligence_score: number;
  authenticity_score: number;
  confidence_level: "high" | "moderate" | "low";
  review_reliability_factor: number;
  top_positive_themes: string[];
  top_negative_themes: string[];
  summary_fr?: string;
  summary_en?: string;
}

// ─── Match Evaluation ───
export interface MatchEvaluation {
  id: string;
  user_id?: string;
  project_id?: string;
  property_id?: string;
  contractor_id: string;
  project_fit_score: number;
  property_fit_score: number;
  ccai_score: number;
  dna_fit_score: number;
  raw_review_fit_score: number;
  weighted_review_fit_score: number;
  unpro_score_snapshot: number;
  aipp_score_snapshot: number;
  availability_score: number;
  budget_fit_score: number;
  risk_modifier: number;
  recommendation_score: number;
  success_probability: number;
  conflict_risk_score: number;
  explanations: MatchExplanations;
  // Joined contractor data
  business_name?: string;
  specialty?: string;
  city?: string;
  province?: string;
  logo_url?: string;
  rating?: number;
  review_count?: number;
  verification_status?: string;
  years_experience?: number;
}

export interface MatchExplanations {
  top_reasons: ExplanationItem[];
  watchouts: ExplanationItem[];
  review_highlights: string[];
  conflict_drivers: string[];
}

export interface ExplanationItem {
  icon?: string;
  text_fr: string;
  text_en: string;
  score_impact?: number;
}

// ─── Contractor Public Scores ───
export interface ContractorPublicScores {
  unpro_score: number;
  aipp_score: number;
  trust_score: number;
  visibility_score: number;
  profile_completeness_score: number;
}

// ─── Performance Metrics ───
export interface ContractorPerformanceMetrics {
  response_time_avg_hours: number;
  appointment_show_rate: number;
  quote_submission_rate: number;
  close_rate: number;
  complaint_rate: number;
  cancellation_rate: number;
  review_sentiment_score: number;
}

// ─── Project Context ───
export interface ProjectContextSnapshot {
  id: string;
  project_id?: string;
  user_id?: string;
  property_id?: string;
  project_type?: string;
  subcategory?: string;
  urgency: string;
  declared_budget_min?: number;
  declared_budget_max?: number;
  occupancy_status: string;
  timeline_preference?: string;
  constraints: Record<string, unknown>;
}
