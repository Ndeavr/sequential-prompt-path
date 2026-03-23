/**
 * AlexFrictionEngine — Detects user friction and reduces decision fatigue.
 * When friction is high: reduce options, push single next step.
 */

export type FrictionLevel = "none" | "low" | "medium" | "high" | "critical";

export interface FrictionSignal {
  type: string;
  weight: number;
  detectedAt: number;
}

export interface FrictionAnalysis {
  level: FrictionLevel;
  score: number; // 0-100
  dominantSignal: string | null;
  recommendation: {
    maxOptionsToShow: number;
    shouldSimplifyLanguage: boolean;
    shouldPushSingleAction: boolean;
    suggestedAction: string | null;
  };
}

const SIGNAL_WEIGHTS: Record<string, number> = {
  inactivity_30s: 10,
  inactivity_60s: 25,
  repeated_hesitation: 20,
  unfinished_upload: 15,
  unfinished_booking: 30,
  score_seen_no_action: 20,
  pricing_viewed_no_selection: 25,
  multiple_page_visits_no_action: 15,
  back_navigation: 10,
  closed_suggestion: 5,
  same_question_twice: 20,
};

export function analyzeFriction(signals: FrictionSignal[]): FrictionAnalysis {
  if (!signals.length) {
    return {
      level: "none",
      score: 0,
      dominantSignal: null,
      recommendation: {
        maxOptionsToShow: 4,
        shouldSimplifyLanguage: false,
        shouldPushSingleAction: false,
        suggestedAction: null,
      },
    };
  }

  // Only consider recent signals (last 5 minutes)
  const recentCutoff = Date.now() - 5 * 60 * 1000;
  const recent = signals.filter((s) => s.detectedAt > recentCutoff);

  const totalScore = recent.reduce((sum, s) => sum + s.weight, 0);
  const capped = Math.min(totalScore, 100);

  // Find dominant signal
  const sorted = [...recent].sort((a, b) => b.weight - a.weight);
  const dominant = sorted[0]?.type ?? null;

  let level: FrictionLevel = "none";
  if (capped >= 70) level = "critical";
  else if (capped >= 50) level = "high";
  else if (capped >= 30) level = "medium";
  else if (capped >= 10) level = "low";

  // Suggest action based on dominant friction
  let suggestedAction: string | null = null;
  if (dominant === "unfinished_booking") suggestedAction = "resume_booking";
  else if (dominant === "unfinished_upload") suggestedAction = "open_upload";
  else if (dominant === "score_seen_no_action") suggestedAction = "explain_score";
  else if (dominant === "pricing_viewed_no_selection") suggestedAction = "recommend_plan";
  else if (capped >= 50) suggestedAction = "simplify_and_guide";

  return {
    level,
    score: capped,
    dominantSignal: dominant,
    recommendation: {
      maxOptionsToShow: capped >= 50 ? 1 : capped >= 30 ? 2 : 4,
      shouldSimplifyLanguage: capped >= 40,
      shouldPushSingleAction: capped >= 50,
      suggestedAction,
    },
  };
}

export function createFrictionSignal(type: string): FrictionSignal {
  return {
    type,
    weight: SIGNAL_WEIGHTS[type] ?? 10,
    detectedAt: Date.now(),
  };
}
