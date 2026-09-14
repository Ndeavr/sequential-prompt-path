import { describe, it, expect } from "vitest";
import {
  PUBLIC_CONTRACTOR_PLANS,
  SUBSCRIBABLE_PLAN_SLUGS,
  RETIRED_PLAN_SLUGS,
  FREE_PLAN_SLUG,
  isSubscribablePlanSlug,
  isRetiredPlanSlug,
  computeYearlyPrice,
  YEARLY_DISCOUNT_RATE,
  getContractorPlan,
} from "@/config/contractorPlans";
import { resolvePlanEligibility } from "@/lib/billing/contractorPlanEligibility";
import type { CatalogPlan } from "@/hooks/usePlanCatalog";

describe("contractor plan catalog — canonical grid", () => {
  it("offers exactly Recrue, Départ, Croissance, Pro, Élite", () => {
    expect(PUBLIC_CONTRACTOR_PLANS.map((p) => p.slug)).toEqual([
      "recrue",
      "depart",
      "croissance_v2",
      "pro_v2",
      "elite_v2",
    ]);
  });

  it("uses the canonical monthly prices", () => {
    expect(PUBLIC_CONTRACTOR_PLANS.map((p) => p.monthlyPrice)).toEqual([0, 149, 299, 599, 999]);
  });

  it("prices every paid year at exactly 20 % off 12 months, floored", () => {
    expect(YEARLY_DISCOUNT_RATE).toBe(0.2);
    for (const plan of PUBLIC_CONTRACTOR_PLANS.filter((p) => !p.free)) {
      expect(plan.yearlyPrice).toBe(computeYearlyPrice(plan.monthlyPrice));
    }
    expect(PUBLIC_CONTRACTOR_PLANS.map((p) => p.yearlyPrice)).toEqual([0, 1430, 2870, 5750, 9590]);
  });

  it("never derives a yearly price from ×10 months or a 15 % rule", () => {
    for (const plan of PUBLIC_CONTRACTOR_PLANS.filter((p) => !p.free)) {
      expect(plan.yearlyPrice).not.toBe(plan.monthlyPrice * 10);
      expect(plan.yearlyPrice).not.toBe(Math.floor(plan.monthlyPrice * 12 * 0.85));
    }
  });

  it("keeps the free plan out of the subscribable list", () => {
    expect(FREE_PLAN_SLUG).toBe("recrue");
    expect(isSubscribablePlanSlug("recrue")).toBe(false);
    expect(SUBSCRIBABLE_PLAN_SLUGS).toEqual(["depart", "croissance_v2", "pro_v2", "elite_v2"]);
  });

  it("keeps Présence and Signature resolvable but retired", () => {
    expect(isRetiredPlanSlug("presence")).toBe(true);
    expect(isRetiredPlanSlug("signature_v2")).toBe(true);
    expect(RETIRED_PLAN_SLUGS).toContain("presence");
    expect(getContractorPlan("presence")?.name).toBe("Présence");
    expect(isSubscribablePlanSlug("presence")).toBe(false);
    expect(isSubscribablePlanSlug("signature_v2")).toBe(false);
  });
});

const catalogPlan = (over: Partial<CatalogPlan>): CatalogPlan =>
  ({
    id: "p1",
    code: "depart",
    name: "Départ",
    monthlyPrice: 14900,
    yearlyPrice: 143000,
    oneTimePrice: 0,
    billingMode: "subscription",
    isFree: false,
    stripeMonthlyPriceId: "price_month",
    stripeYearlyPriceId: "price_year",
    supportsYearly: true,
    tagline: "",
    features: [],
    appointmentsIncluded: 1,
    appointmentsRangeMin: 1,
    appointmentsRangeMax: 1,
    projectSizes: [],
    appointmentNotes: [],
    highlighted: false,
    priorityLevel: 1,
    matchingBoost: 0,
    badgeText: "",
    shortPitch: "",
    positionRank: 1,
    ...over,
  }) as CatalogPlan;

const baseQuote = {
  id: "q1",
  user_id: "u1",
  recommended_plan: "depart",
  pricing_status: "offered",
  pricing_mode: "goal",
  expires_at: "2030-01-01T00:00:00Z",
  created_at: "2026-01-01T00:00:00Z",
};

describe("plan eligibility — retired and free plans", () => {
  it("never offers a retired plan, even from a stale quote", () => {
    const r = resolvePlanEligibility({
      quote: { ...baseQuote, recommended_plan: "presence" },
      plans: [catalogPlan({ code: "presence", name: "Présence" })],
      interval: "month",
    });
    expect(r).toEqual({ mode: "custom_only", reason: "plan_retired" });
  });

  it("routes the free plan to activation instead of checkout", () => {
    const r = resolvePlanEligibility({
      quote: { ...baseQuote, recommended_plan: "recrue" },
      plans: [
        catalogPlan({
          code: "recrue",
          name: "Recrue",
          monthlyPrice: 0,
          yearlyPrice: 0,
          isFree: true,
          supportsYearly: false,
          stripeMonthlyPriceId: "",
          stripeYearlyPriceId: "",
        }),
      ],
      interval: "month",
    });
    expect(r).toEqual({
      mode: "free_activation",
      allowedPlanCode: "recrue",
      quoteId: "q1",
      reason: "free_plan",
    });
  });

  it("offers a paid canonical plan for both intervals", () => {
    for (const interval of ["month", "year"] as const) {
      const r = resolvePlanEligibility({ quote: baseQuote, plans: [catalogPlan({})], interval });
      expect(r.mode).toBe("standard");
    }
  });
});
