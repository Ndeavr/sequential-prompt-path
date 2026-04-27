/**
 * UNPRO — PRICING SINGLE SOURCE OF TRUTH
 *
 * This file is the ONE place every UI / service / Alex prompt
 * imports plan information from. Anything else is a regression.
 *
 * - Re-exports the canonical contractor plan catalog.
 * - Freezes the list of FORBIDDEN legacy names so the regression
 *   guard (src/dev/legacyPlanGuard.ts) can detect them at runtime.
 *
 * If you need to introduce a new plan, edit `src/config/contractorPlans.ts`
 * and update the `CANONICAL_PLAN_SLUGS` list below. Never re-introduce
 * "Essentiel", "Starter", or "Basic" — these are dead.
 */

import {
  CONTRACTOR_PLANS,
  FOUNDER_OFFERS,
  PLAN_PRICE_MAP,
  formatPrice,
  getContractorPlan,
  getRecommendedPlanSlug,
  type ContractorPlan,
  type ContractorPlanSlug,
  type FounderOffer,
} from "./contractorPlans";

// ─── Canonical exports (use these everywhere) ───
export {
  CONTRACTOR_PLANS,
  FOUNDER_OFFERS,
  PLAN_PRICE_MAP,
  formatPrice,
  getContractorPlan,
  getRecommendedPlanSlug,
};
export type { ContractorPlan, ContractorPlanSlug, FounderOffer };

/** The only valid plan slugs, derived from the canonical catalog. */
export const CANONICAL_PLAN_SLUGS: readonly ContractorPlanSlug[] = Object.freeze(
  CONTRACTOR_PLANS.map((p) => p.slug),
);

/** Display labels for canonical plans (use in menus, badges, admin). */
export const CANONICAL_PLAN_LABELS: Record<ContractorPlanSlug, string> = Object.freeze({
  recrue: "Recrue",
  pro: "Pro",
  premium: "Premium",
  elite: "Élite",
  signature: "Signature",
});

/**
 * Legacy plan names that MUST NEVER appear in UI, prompts, or DB writes.
 * Lowercased for case-insensitive matching by the regression guard.
 */
export const FORBIDDEN_LEGACY_PLAN_NAMES: readonly string[] = Object.freeze([
  "essentiel",
  "starter",
  "basic",
  "découverte",
  "decouverte",
]);

/** True if a label/slug is a known legacy (forbidden) plan name. */
export function isLegacyPlanName(name: string | null | undefined): boolean {
  if (!name) return false;
  return FORBIDDEN_LEGACY_PLAN_NAMES.includes(name.trim().toLowerCase());
}

/** True if a slug is part of the canonical catalog. */
export function isCanonicalPlanSlug(slug: string | null | undefined): boolean {
  if (!slug) return false;
  return (CANONICAL_PLAN_SLUGS as readonly string[]).includes(slug.toLowerCase());
}
