/**
 * UNPRO — CANONICAL PLAN RECOMMENDATION ENGINE
 * ============================================
 * PROTECTED FILE. Every automated surface that suggests a contractor plan
 * (sales closer, Alex, outreach SMS/email, activation pipeline, personalized
 * plan generation) MUST resolve its recommendation here.
 *
 * WHY THIS EXISTS
 * ---------------
 * After the plan renaming (recrue/elite/signature → presence/premium/domination)
 * several switch tables kept the OLD ordinal positions. The sales closer ended
 * up mapping weak leads (score 40–59) to `domination` ($1,499/mo) while strong
 * leads (score ≥ 80) got `pro` ($299/mo). That is non-monotonic and was a P0
 * revenue-integrity defect.
 *
 * HARD RULES ENFORCED HERE
 *  1. Monotonicity: a LOWER score can never yield a HIGHER-priced plan when all
 *     other attributes are equal. `assertMonotonic()` proves it at runtime.
 *  2. Top tier (`domination`) requires explicit strong evidence — never a
 *     default, never a fallback.
 *  3. Low confidence (missing score/signals) → mid-entry plan, never top tier.
 *  4. Prices/Stripe IDs are NEVER decided here. This module returns a plan CODE
 *     only; `_shared/planCatalog.ts` resolves the money from `public.plans`.
 */

export type CanonicalPlanCode =
  | "presence"
  | "local"
  | "croissance"
  | "pro"
  | "premium"
  | "domination";

/** Canonical ladder, cheapest → most expensive. Index = rank - 1. */
export const PLAN_LADDER: readonly CanonicalPlanCode[] = [
  "presence",
  "local",
  "croissance",
  "pro",
  "premium",
  "domination",
];

export const PLAN_LABELS: Record<CanonicalPlanCode, string> = {
  presence: "Présence",
  local: "Local",
  croissance: "Croissance",
  pro: "Pro",
  premium: "Premium",
  domination: "Domination",
};

export function planRank(code: CanonicalPlanCode): number {
  return PLAN_LADDER.indexOf(code) + 1;
}

function fromRank(rank: number): CanonicalPlanCode {
  const clamped = Math.max(1, Math.min(PLAN_LADDER.length, Math.round(rank)));
  return PLAN_LADDER[clamped - 1];
}

export interface PlanRecommendationInput {
  /** Visibility / AIPP score 0–100. `null` = unknown (low confidence). */
  visibilityScore?: number | null;
  reviewCount?: number | null;
  googleRating?: number | null;
  city?: string | null;
  /** Trade / service category slug or label. */
  category?: string | null;
  /** Number of competing contractors already active in the city × category. */
  competitorCount?: number | null;
  /** Number of cities / territories the contractor wants to cover. */
  territoryCount?: number | null;
  /** Remaining exclusive slots in the target territory (0 = sold out). */
  remainingSlots?: number | null;
  /** Contractor-stated monthly appointment goal / capacity. */
  monthlyAppointmentGoal?: number | null;
  /** Explicit contractor goal, if captured. */
  goal?: "visibility" | "appointments" | "conversion" | "ai_presence" | "territory" | null;
}

export interface PlanRecommendationResult {
  plan: CanonicalPlanCode;
  label: string;
  rank: number;
  /** 0–1. Below 0.4 the recommendation is capped at `croissance`. */
  confidence: number;
  /** Human-readable, fr-CA. Always explainable to the contractor. */
  rationale: string;
  /** Ordered list of the signals that moved the recommendation. */
  factors: string[];
  /** True when the top tier was requested by signals but blocked by a guard. */
  cappedByGuard: boolean;
}

const HIGH_DEMAND_CITIES = new Set([
  "montréal", "montreal", "laval", "longueuil", "québec", "quebec",
  "gatineau", "sherbrooke", "brossard", "terrebonne", "repentigny", "lévis", "levis",
]);

/** Base tier purely from visibility score. Strictly non-decreasing in score. */
function baseRankFromScore(score: number): number {
  if (score < 25) return 1; // presence
  if (score < 40) return 2; // local
  if (score < 60) return 2; // local  ← the 40–59 band. NEVER domination.
  if (score < 75) return 3; // croissance
  if (score < 88) return 4; // pro
  return 5; // premium
}

export function recommendPlan(input: PlanRecommendationInput): PlanRecommendationResult {
  const hasScore = typeof input.visibilityScore === "number" && !Number.isNaN(input.visibilityScore);
  const score = hasScore ? Math.max(0, Math.min(100, Number(input.visibilityScore))) : 50;
  const reviews = Number(input.reviewCount ?? 0);
  const rating = Number(input.googleRating ?? 0);
  const city = String(input.city ?? "").trim().toLowerCase();
  const goalAppointments = Number(input.monthlyAppointmentGoal ?? 0);
  const territories = Number(input.territoryCount ?? 0);
  const competitors = Number(input.competitorCount ?? 0);
  const remainingSlots = input.remainingSlots;

  const factors: string[] = [];
  let rank = baseRankFromScore(score);
  factors.push(
    hasScore
      ? `Score de visibilité ${Math.round(score)}/100 → socle ${PLAN_LABELS[fromRank(rank)]}`
      : "Score de visibilité inconnu → socle prudent",
  );

  // ── Confidence ────────────────────────────────────────────────────────────
  let confidence = 0.35;
  if (hasScore) confidence += 0.3;
  if (reviews > 0) confidence += 0.15;
  if (city) confidence += 0.1;
  if (input.category) confidence += 0.1;
  confidence = Math.min(1, confidence);

  // ── Upward adjustments (each +1 rank max, additive, capped below) ─────────
  const strongReputation = reviews >= 50 && rating >= 4.3;
  const dominantReputation = reviews >= 150 && rating >= 4.5;

  if (strongReputation) {
    rank += 1;
    factors.push(`Réputation solide (${reviews} avis, ${rating}/5) → +1 palier`);
  }
  if (city && HIGH_DEMAND_CITIES.has(city)) {
    rank += 1;
    factors.push(`Marché à forte demande (${input.city}) → +1 palier`);
  }
  if (competitors >= 15) {
    rank += 1;
    factors.push(`Concurrence élevée (${competitors} entrepreneurs actifs) → +1 palier`);
  }
  if (goalAppointments >= 20) {
    rank += 1;
    factors.push(`Objectif de ${goalAppointments} rendez-vous/mois → +1 palier`);
  } else if (goalAppointments > 0 && goalAppointments <= 5) {
    rank -= 1;
    factors.push(`Capacité limitée (${goalAppointments} rendez-vous/mois) → -1 palier`);
  }
  if (territories >= 3) {
    rank += 1;
    factors.push(`Couverture de ${territories} territoires → +1 palier`);
  }
  if (typeof remainingSlots === "number" && remainingSlots >= 0 && remainingSlots <= 1) {
    rank += 1;
    factors.push("Exclusivité de territoire presque épuisée → +1 palier");
  }
  if (input.goal === "territory") {
    rank += 1;
    factors.push("Objectif déclaré : dominer le territoire → +1 palier");
  }

  rank = Math.max(1, Math.min(PLAN_LADDER.length, rank));

  // ── GUARDS ────────────────────────────────────────────────────────────────
  let cappedByGuard = false;

  // Guard 1 — top tier requires explicit strong evidence.
  const eligibleForTop =
    score >= 75 &&
    (dominantReputation ||
      (typeof remainingSlots === "number" && remainingSlots <= 1) ||
      territories >= 3);
  if (rank === 6 && !eligibleForTop) {
    rank = 5;
    cappedByGuard = true;
    factors.push("Garde-fou : Domination exige des signaux dominants confirmés → plafonné à Premium");
  }

  // Guard 2 — low confidence never sells above the mid plan.
  if (confidence < 0.5 && rank > 3) {
    rank = 3;
    cappedByGuard = true;
    factors.push("Garde-fou : confiance insuffisante → plan intermédiaire (Croissance)");
  }

  // Guard 3 — a weak score can never land above Croissance, whatever the boosts.
  if (score < 60 && rank > 3) {
    rank = 3;
    cappedByGuard = true;
    factors.push("Garde-fou : score faible (<60) → plafonné à Croissance");
  }

  const plan = fromRank(rank);
  return {
    plan,
    label: PLAN_LABELS[plan],
    rank,
    confidence: Number(confidence.toFixed(2)),
    rationale: buildRationale(plan, score, hasScore, factors),
    factors,
    cappedByGuard,
  };
}

function buildRationale(
  plan: CanonicalPlanCode,
  score: number,
  hasScore: boolean,
  factors: string[],
): string {
  const head = hasScore
    ? `Score de visibilité ${Math.round(score)}/100.`
    : "Signaux incomplets — recommandation prudente.";
  return `${head} Plan recommandé : ${PLAN_LABELS[plan]}. ${factors.slice(1, 3).join(" ")}`.trim();
}

/**
 * Runtime proof of monotonicity: for a fixed attribute set, the recommended
 * rank must be non-decreasing as the visibility score increases.
 * Returns the offending pair when the invariant breaks.
 */
export function assertMonotonic(
  attrs: Omit<PlanRecommendationInput, "visibilityScore"> = {},
): { ok: true } | { ok: false; at: number; prev: string; next: string } {
  let prevRank = 0;
  let prevPlan = "";
  for (let s = 0; s <= 100; s++) {
    const r = recommendPlan({ ...attrs, visibilityScore: s });
    if (r.rank < prevRank) {
      return { ok: false, at: s, prev: prevPlan, next: r.plan };
    }
    prevRank = r.rank;
    prevPlan = r.plan;
  }
  return { ok: true };
}

/** Map a stated monthly appointment need to a canonical plan (capacity-first). */
export function recommendPlanFromCapacity(
  monthlyAppointments: number,
  extra: PlanRecommendationInput = {},
): PlanRecommendationResult {
  return recommendPlan({ ...extra, monthlyAppointmentGoal: monthlyAppointments });
}
