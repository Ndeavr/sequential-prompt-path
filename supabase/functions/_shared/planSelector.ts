/**
 * UNPRO — DEPRECATED plan selector.
 * ---------------------------------
 * This module used to own its own score→plan table and jumped straight to
 * `domination` whenever `is_exclusive_territory` was truthy. It now delegates
 * to the single canonical engine `_shared/planRecommendation.ts`, which is
 * monotonic and guarded. Keep the exported shape for backwards compatibility.
 */
import {
  recommendPlan as canonicalRecommendPlan,
  PLAN_LABELS,
  type CanonicalPlanCode,
} from "./planRecommendation.ts";

export type PlanSlug = CanonicalPlanCode;

export interface PlanInputs {
  aipp_score?: number | null;
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

/**
 * Display-only reference prices. Money charged always comes from
 * `public.plans` through `_shared/planCatalog.ts`.
 */
const PRICE_CENTS: Record<PlanSlug, number> = {
  presence: 4900,
  local: 7900,
  croissance: 14900,
  pro: 29900,
  premium: 59900,
  domination: 149900,
};

export function selectPlan(input: PlanInputs): PlanRecommendation {
  const rec = canonicalRecommendPlan({
    visibilityScore: input.aipp_score ?? null,
    reviewCount: input.review_count ?? null,
    googleRating: input.google_rating ?? null,
    city: input.city ?? null,
    category: input.trade ?? null,
    competitorCount: input.competitor_count_in_city ?? null,
    // Exclusivity is a SIGNAL (+1 tier), never an instant jump to the top tier.
    remainingSlots: input.is_exclusive_territory ? 1 : null,
  });
  return { plan: rec.plan, cents: PRICE_CENTS[rec.plan], rationale: rec.rationale };
}

export function planLabel(plan: PlanSlug): string {
  return PLAN_LABELS[plan];
}

export { PRICE_CENTS };
