import { describe, it, expect } from "vitest";
import {
  resolvePlanEligibility,
  type EligibilityQuote,
} from "@/lib/billing/contractorPlanEligibility";
import type { CatalogPlan } from "@/hooks/usePlanCatalog";

const NOW = new Date("2026-01-15T12:00:00Z").getTime();

const plan = (over: Partial<CatalogPlan> = {}): CatalogPlan =>
  ({
    id: "p1",
    code: "croissance",
    name: "Croissance",
    monthlyPrice: 14900,
    yearlyPrice: 149000,
    oneTimePrice: 0,
    billingMode: "subscription",
    stripeMonthlyPriceId: "price_month",
    stripeYearlyPriceId: "",
    supportsYearly: false,
    tagline: "",
    features: [],
    appointmentsIncluded: 0,
    appointmentsRangeMin: 0,
    appointmentsRangeMax: 0,
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

const quote = (over: Partial<EligibilityQuote> = {}): EligibilityQuote => ({
  id: "q1",
  user_id: "u1",
  recommended_plan: "croissance",
  pricing_status: "offered",
  pricing_mode: "goal",
  expires_at: "2026-02-01T00:00:00Z",
  created_at: "2026-01-10T00:00:00Z",
  ...over,
});

describe("resolvePlanEligibility", () => {
  it("offers the standard plan when the quote is valid", () => {
    const r = resolvePlanEligibility({ quote: quote(), plans: [plan()], interval: "month", now: NOW });
    expect(r).toEqual({
      mode: "standard",
      allowedPlanCode: "croissance",
      quoteId: "q1",
      reason: "valid_quote",
    });
  });

  it("is custom-only without any quote", () => {
    const r = resolvePlanEligibility({ quote: null, plans: [plan()], interval: "month", now: NOW });
    expect(r).toEqual({ mode: "custom_only", reason: "no_quote" });
  });

  it("is custom-only when the quote expired", () => {
    const r = resolvePlanEligibility({
      quote: quote({ expires_at: "2026-01-01T00:00:00Z" }),
      plans: [plan()],
      interval: "month",
      now: NOW,
    });
    expect(r).toEqual({ mode: "custom_only", reason: "quote_expired" });
  });

  it("is custom-only when waitlisted or rejected", () => {
    for (const status of ["waitlisted", "rejected", "paid"]) {
      const r = resolvePlanEligibility({
        quote: quote({ pricing_status: status }),
        plans: [plan()],
        interval: "month",
        now: NOW,
      });
      expect(r).toEqual({ mode: "custom_only", reason: "quote_not_selectable" });
    }
  });

  it("rejects historical pack quotes", () => {
    const r = resolvePlanEligibility({
      quote: quote({ pricing_mode: "pack" }),
      plans: [plan()],
      interval: "month",
      now: NOW,
    });
    expect(r).toEqual({ mode: "custom_only", reason: "quote_not_selectable" });
  });

  it("is custom-only when the recommended plan is not in the active catalog", () => {
    const r = resolvePlanEligibility({
      quote: quote({ recommended_plan: "inexistant" }),
      plans: [plan()],
      interval: "month",
      now: NOW,
    });
    expect(r).toEqual({ mode: "custom_only", reason: "plan_unavailable" });
  });

  it("is custom-only when no monthly Stripe price exists", () => {
    const r = resolvePlanEligibility({
      quote: quote(),
      plans: [plan({ stripeMonthlyPriceId: "" })],
      interval: "month",
      now: NOW,
    });
    expect(r).toEqual({ mode: "custom_only", reason: "price_not_configured" });
  });

  it("falls back to the monthly price when yearly is not configured", () => {
    const r = resolvePlanEligibility({
      quote: quote(),
      plans: [plan()],
      interval: "year",
      now: NOW,
    });
    expect(r.mode).toBe("standard");
  });
});
