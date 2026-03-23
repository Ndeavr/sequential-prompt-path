/**
 * AlexRealityEngine — Predictive intelligence that anticipates user needs.
 * Fuses real-world signals (season, weather, time, property age) with
 * platform data (memory, session, scores) to proactively suggest actions.
 */

// ─── Types ───────────────────────────────────────────────────────────
export type TriggerType =
  | "passive_suggestion"
  | "contextual_nudge"
  | "strong_recommendation"
  | "urgent_alert";

export type PredictedNeed =
  | "roof_inspection"
  | "insulation_check"
  | "gutter_cleaning"
  | "hvac_maintenance"
  | "pool_opening"
  | "pool_closing"
  | "snow_removal"
  | "spring_inspection"
  | "fall_prep"
  | "photo_upload"
  | "score_review"
  | "booking_followup"
  | "plan_upgrade"
  | "profile_completion"
  | "aipp_improvement"
  | "condo_meeting_prep"
  | "document_review"
  | "general_maintenance";

export interface RealitySignals {
  season: "spring" | "summer" | "fall" | "winter";
  month: number;
  localHour: number;
  weatherHint?: "snow" | "rain" | "heat" | "freeze" | "normal";
  propertyAge?: number;
  propertyType?: string;
  lastWorksMonthsAgo?: number;
  hasScore: boolean;
  hasPhoto: boolean;
  hasBooking: boolean;
  hasPlan: boolean;
  hasProfile: boolean;
  ignoredSuggestions: number;
  lastSuggestionAt: number | null;
  lastUserActionAt: number | null;
  role: "homeowner" | "contractor" | "condo" | "admin";
}

export interface RealityPrediction {
  predictedNeed: PredictedNeed;
  urgencyLevel: "low" | "medium" | "high" | "critical";
  confidenceScore: number;
  recommendedAction: string;
  alexText: string;
  uiActions: Array<{ type: string; target?: string }>;
  triggerType: TriggerType;
}

// ─── Season helper ───────────────────────────────────────────────────
export function getCurrentSeason(): RealitySignals["season"] {
  const m = new Date().getMonth() + 1;
  if (m >= 3 && m <= 5) return "spring";
  if (m >= 6 && m <= 8) return "summer";
  if (m >= 9 && m <= 11) return "fall";
  return "winter";
}

// ─── Safety / Cooldown ──────────────────────────────────────────────
const MIN_INTERVAL_MS = 30_000;      // 30 s minimum between suggestions
const MAX_INTERVAL_MS = 90_000;      // 90 s max cadence
const COOLDOWN_AFTER_ACTION_MS = 15_000;
const MAX_IGNORED = 2;

export function shouldTrigger(signals: RealitySignals): boolean {
  const now = Date.now();

  // Stop if user ignored 2+ suggestions
  if (signals.ignoredSuggestions >= MAX_IGNORED) return false;

  // Cooldown after user action
  if (signals.lastUserActionAt && now - signals.lastUserActionAt < COOLDOWN_AFTER_ACTION_MS) return false;

  // Rate limit
  if (signals.lastSuggestionAt && now - signals.lastSuggestionAt < MIN_INTERVAL_MS) return false;

  return true;
}

// ─── Seasonal predictions (QC climate) ──────────────────────────────
const SEASONAL_RULES: Array<{
  seasons: RealitySignals["season"][];
  months?: number[];
  weather?: RealitySignals["weatherHint"][];
  need: PredictedNeed;
  text: string;
  urgency: RealityPrediction["urgencyLevel"];
  confidence: number;
  action: string;
  uiAction: string;
}> = [
  {
    seasons: ["winter"],
    weather: ["snow"],
    need: "roof_inspection",
    text: "Avec la neige qu'on a… ton entretoit pourrait accumuler de l'humidité. Tu veux que je regarde ça avec une photo ?",
    urgency: "medium",
    confidence: 0.75,
    action: "upload_photo",
    uiAction: "open_upload",
  },
  {
    seasons: ["winter"],
    weather: ["snow", "freeze"],
    need: "snow_removal",
    text: "C'est le moment de vérifier si ton toit supporte bien l'accumulation. Un pro peut inspecter ça rapidement.",
    urgency: "medium",
    confidence: 0.7,
    action: "prepare_booking",
    uiAction: "open_booking",
  },
  {
    seasons: ["spring"],
    months: [3, 4],
    need: "spring_inspection",
    text: "C'est le bon moment pour vérifier ton isolation après l'hiver. Tu veux voir ton score actuel ?",
    urgency: "low",
    confidence: 0.8,
    action: "show_score",
    uiAction: "show_score",
  },
  {
    seasons: ["spring"],
    months: [4, 5],
    need: "gutter_cleaning",
    text: "Après l'hiver, tes gouttières ont probablement besoin d'un bon nettoyage. On regarde ça ?",
    urgency: "low",
    confidence: 0.72,
    action: "prepare_booking",
    uiAction: "open_booking",
  },
  {
    seasons: ["spring"],
    months: [4, 5],
    need: "pool_opening",
    text: "C'est presque le temps d'ouvrir la piscine. Tu veux trouver un pro pour ça ?",
    urgency: "low",
    confidence: 0.65,
    action: "prepare_booking",
    uiAction: "open_booking",
  },
  {
    seasons: ["summer"],
    weather: ["heat"],
    need: "hvac_maintenance",
    text: "Avec la chaleur, ton climatiseur travaille fort. Un entretien peut éviter une panne.",
    urgency: "medium",
    confidence: 0.7,
    action: "prepare_booking",
    uiAction: "open_booking",
  },
  {
    seasons: ["fall"],
    months: [9, 10],
    need: "fall_prep",
    text: "L'automne, c'est le moment idéal pour inspecter ta toiture avant l'hiver. Tu veux qu'on regarde ?",
    urgency: "medium",
    confidence: 0.78,
    action: "show_score",
    uiAction: "show_score",
  },
  {
    seasons: ["fall"],
    months: [9, 10],
    need: "insulation_check",
    text: "Avant le froid, vérifie que ton isolation est au point. Une photo peut m'aider à évaluer.",
    urgency: "medium",
    confidence: 0.76,
    action: "upload_photo",
    uiAction: "open_upload",
  },
  {
    seasons: ["fall"],
    months: [9, 10],
    need: "pool_closing",
    text: "C'est bientôt le temps de fermer la piscine pour l'hiver. Tu veux planifier ça ?",
    urgency: "low",
    confidence: 0.65,
    action: "prepare_booking",
    uiAction: "open_booking",
  },
];

// ─── Context-based predictions ──────────────────────────────────────
function getContextPredictions(signals: RealitySignals): RealityPrediction[] {
  const predictions: RealityPrediction[] = [];

  // Property age triggers
  if (signals.propertyAge && signals.propertyAge > 25 && !signals.hasScore) {
    predictions.push({
      predictedNeed: "score_review",
      urgencyLevel: "medium",
      confidenceScore: 0.8,
      recommendedAction: "show_score",
      alexText: "Ta propriété a plus de 25 ans. Un diagnostic rapide pourrait révéler des priorités d'entretien.",
      uiActions: [{ type: "show_score" }],
      triggerType: "contextual_nudge",
    });
  }

  // No photo yet
  if (!signals.hasPhoto && signals.role === "homeowner") {
    predictions.push({
      predictedNeed: "photo_upload",
      urgencyLevel: "low",
      confidenceScore: 0.65,
      recommendedAction: "upload_photo",
      alexText: "Une photo m'aiderait à mieux comprendre ta situation. Tu veux essayer ?",
      uiActions: [{ type: "open_upload" }],
      triggerType: "passive_suggestion",
    });
  }

  // Score seen but no booking
  if (signals.hasScore && !signals.hasBooking && signals.role === "homeowner") {
    predictions.push({
      predictedNeed: "booking_followup",
      urgencyLevel: "medium",
      confidenceScore: 0.75,
      recommendedAction: "prepare_booking",
      alexText: "Ton score est prêt. Le plus utile maintenant, c'est de planifier un rendez-vous avec un pro.",
      uiActions: [{ type: "open_booking" }],
      triggerType: "contextual_nudge",
    });
  }

  // Contractor without profile completion
  if (signals.role === "contractor" && !signals.hasProfile) {
    predictions.push({
      predictedNeed: "profile_completion",
      urgencyLevel: "medium",
      confidenceScore: 0.8,
      recommendedAction: "complete_profile",
      alexText: "Tu pourrais recevoir plus d'opportunités en complétant ton profil. On s'y met ?",
      uiActions: [{ type: "navigate", target: "/dashboard/contractor/profile" }],
      triggerType: "contextual_nudge",
    });
  }

  // Contractor plan upgrade
  if (signals.role === "contractor" && !signals.hasPlan && signals.hasProfile) {
    predictions.push({
      predictedNeed: "plan_upgrade",
      urgencyLevel: "medium",
      confidenceScore: 0.72,
      recommendedAction: "recommend_plan",
      alexText: "Tu pourrais facilement remplir 3 rendez-vous de plus par semaine. Tu veux voir comment ?",
      uiActions: [{ type: "show_plan_recommendation" }],
      triggerType: "contextual_nudge",
    });
  }

  // Condo meeting prep (evening hours)
  if (signals.role === "condo" && signals.localHour >= 18) {
    predictions.push({
      predictedNeed: "condo_meeting_prep",
      urgencyLevel: "low",
      confidenceScore: 0.6,
      recommendedAction: "prep_meeting",
      alexText: "Si c'est pour le syndicat, on devrait structurer ça avant la prochaine assemblée. Tu veux que je t'aide ?",
      uiActions: [{ type: "navigate", target: "/dashboard/condo" }],
      triggerType: "passive_suggestion",
    });
  }

  return predictions;
}

// ─── Seasonal predictions ───────────────────────────────────────────
function getSeasonalPredictions(signals: RealitySignals): RealityPrediction[] {
  const predictions: RealityPrediction[] = [];

  for (const rule of SEASONAL_RULES) {
    if (!rule.seasons.includes(signals.season)) continue;
    if (rule.months && !rule.months.includes(signals.month)) continue;
    if (rule.weather && signals.weatherHint && !rule.weather.includes(signals.weatherHint)) continue;
    if (rule.weather && !signals.weatherHint) continue; // need weather match

    // Skip photo suggestion if already has photo
    if (rule.uiAction === "open_upload" && signals.hasPhoto) continue;
    // Skip score if already has score
    if (rule.uiAction === "show_score" && signals.hasScore) continue;

    predictions.push({
      predictedNeed: rule.need,
      urgencyLevel: rule.urgency,
      confidenceScore: rule.confidence,
      recommendedAction: rule.action,
      alexText: rule.text,
      uiActions: [{ type: rule.uiAction }],
      triggerType: rule.confidence >= 0.75 ? "contextual_nudge" : "passive_suggestion",
    });
  }

  return predictions;
}

// ─── Main prediction engine ─────────────────────────────────────────
export function predictNeeds(signals: RealitySignals): RealityPrediction | null {
  if (!shouldTrigger(signals)) return null;

  const seasonal = getSeasonalPredictions(signals);
  const contextual = getContextPredictions(signals);

  // Merge and sort by confidence
  const all = [...seasonal, ...contextual].sort(
    (a, b) => b.confidenceScore - a.confidenceScore
  );

  // Return only the single best prediction
  return all[0] ?? null;
}

// ─── Timeline Engine ────────────────────────────────────────────────
export interface TimelineEntry {
  action: string;
  timestamp: number;
  completed: boolean;
}

export interface TimelineAnalysis {
  nextLogicalStep: string | null;
  delayedActions: string[];
  missedOpportunities: string[];
}

export function analyzeTimeline(entries: TimelineEntry[]): TimelineAnalysis {
  const completed = entries.filter((e) => e.completed).map((e) => e.action);
  const incomplete = entries.filter((e) => !e.completed).map((e) => e.action);

  const FLOW = ["photo_upload", "score_review", "booking", "plan_selection"];
  const nextIdx = FLOW.findIndex((step) => !completed.includes(step));

  const now = Date.now();
  const delayed = entries
    .filter((e) => !e.completed && now - e.timestamp > 24 * 60 * 60 * 1000)
    .map((e) => e.action);

  const missed = entries
    .filter((e) => !e.completed && now - e.timestamp > 7 * 24 * 60 * 60 * 1000)
    .map((e) => e.action);

  return {
    nextLogicalStep: nextIdx >= 0 ? FLOW[nextIdx] : null,
    delayedActions: delayed,
    missedOpportunities: missed,
  };
}
