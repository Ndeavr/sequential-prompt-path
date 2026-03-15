/**
 * UNPRO — Quote Quality Score Types
 * Typed contract for the Quote Quality Score engine.
 */

export interface QuoteQualityCategoryScore {
  /** Category key */
  key: string;
  /** Display name (French) */
  label: string;
  /** Score for this category */
  score: number;
  /** Maximum possible score */
  max: number;
  /** Fields that contributed positively */
  present: string[];
  /** Fields that were missing or unclear */
  missing: string[];
}

export type QuoteQualityTier =
  | "faible"        // 0–39
  | "partiel"       // 40–59
  | "correct"       // 60–79
  | "bien_structure" // 80–100
  ;

export interface QuoteQualityResult {
  /** Total score out of 100 */
  total_score: number;
  /** Interpretation tier */
  tier: QuoteQualityTier;
  /** Tier label in French */
  tier_label: string;
  /** Category breakdown */
  categories: QuoteQualityCategoryScore[];
  /** Strengths of the quote (French) */
  strengths: string[];
  /** Missing information (French) */
  missing_info: string[];
  /** Potential red flags — neutral tone (French) */
  red_flags: string[];
  /** Questions the homeowner should ask (French) */
  questions_to_ask: string[];
}
