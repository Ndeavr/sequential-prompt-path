/**
 * UNPRO — Plan auto-selector for the Autonomous Launch Engine.
 * Deterministic mapping of opportunity signals → recommended contractor plan.
 *
 * Plans (cents): Recrue 14900, Pro 34900, Premium 59900, Élite 99900.
 */

export type PlanSlug = "recrue" | "pro" | "premium" | "elite";

export interface PlanInputs {
  aipp_score?: number | null;       // 0-100
  review_count?: number | null;
  google_rating?: number | null;
  city?: string | null;
  trade?: string | null;
  competitor_count_in_city?: number | null;
  is_exclusive_territory?: boolean;
}

export interface PlanRecommendation {
  plan: PlanSlug;
  cents: number;
  rationale: string;
}

const PRICE_CENTS: Record<PlanSlug, number> = {
  recrue: 14900,
  pro: 34900,
  premium: 59900,
  elite: 99900,
};

const HIGH_DEMAND_CITIES = new Set([
  "Montréal", "Montreal", "Laval", "Longueuil", "Québec", "Quebec",
  "Gatineau", "Sherbrooke", "Brossard",
]);

export function selectPlan(input: PlanInputs): PlanRecommendation {
  const score = input.aipp_score ?? 0;
  const reviews = input.review_count ?? 0;
  const rating = input.google_rating ?? 0;
  const city = (input.city ?? "").trim();
  const highDemand = HIGH_DEMAND_CITIES.has(city);
  const reviewsStrong = reviews >= 20 && rating >= 4.0;
  const dominant = reviews >= 100 && rating >= 4.5;

  // 1. Dominant / exclusive territory → Élite
  if (input.is_exclusive_territory || dominant) {
    return {
      plan: "elite",
      cents: PRICE_CENTS.elite,
      rationale: dominant
        ? `Acteur dominant (${reviews} avis, ${rating}/5)`
        : "Territoire exclusif disponible",
    };
  }

  // 2. High-demand city + decent presence → Premium
  if (highDemand && reviewsStrong) {
    return {
      plan: "premium",
      cents: PRICE_CENTS.premium,
      rationale: `Marché haute demande (${city}) avec base solide d'avis`,
    };
  }

  // 3. Strong reviews but weak AI visibility → Pro
  if (reviewsStrong && score < 60) {
    return {
      plan: "pro",
      cents: PRICE_CENTS.pro,
      rationale: `Réputation forte mais visibilité IA faible (score ${score})`,
    };
  }

  // 4. Strong AI visibility → Pro (room to scale)
  if (score >= 60) {
    return {
      plan: "pro",
      cents: PRICE_CENTS.pro,
      rationale: `Bonne visibilité IA (score ${score}) — plan Pro recommandé`,
    };
  }

  // 5. Default — small market / low signals → Recrue
  return {
    plan: "recrue",
    cents: PRICE_CENTS.recrue,
    rationale: reviews === 0
      ? "Aucun avis Google — démarrer avec Recrue"
      : `Signaux limités (score ${score}, ${reviews} avis)`,
  };
}

export function planLabel(plan: PlanSlug): string {
  return ({
    recrue: "Recrue",
    pro: "Pro",
    premium: "Premium",
    elite: "Élite",
  })[plan];
}

export { PRICE_CENTS };
