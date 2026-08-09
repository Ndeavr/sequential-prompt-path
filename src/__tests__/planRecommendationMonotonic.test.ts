/**
 * P0 regression guard — automated plan recommendation must be monotonic.
 * Root cause covered: the sales closer mapped score 40–59 → Domination
 * ($1,499/mo) while score ≥ 80 → Pro ($299/mo) after the tier renaming.
 */
import { describe, expect, it } from "vitest";
import {
  recommendPlan,
  recommendPlanFromCapacity,
  assertMonotonic,
  planRank,
  PLAN_LADDER,
} from "../../supabase/functions/_shared/planRecommendation";

describe("plan recommendation — canonical ladder", () => {
  it("orders the ladder cheapest → most expensive", () => {
    expect([...PLAN_LADDER]).toEqual([
      "presence", "local", "croissance", "pro", "premium", "domination",
    ]);
  });

  it("NEVER recommends Domination for weak leads scoring 40–59", () => {
    for (let s = 40; s <= 59; s++) {
      const r = recommendPlan({ visibilityScore: s });
      expect(r.plan).not.toBe("domination");
      expect(r.plan).not.toBe("premium");
      expect(planRank(r.plan)).toBeLessThanOrEqual(3);
    }
  });

  it("never recommends Domination for a 40–59 lead even with every boost on", () => {
    for (let s = 40; s <= 59; s++) {
      const r = recommendPlan({
        visibilityScore: s,
        reviewCount: 500,
        googleRating: 5,
        city: "Laval",
        category: "plomberie",
        competitorCount: 40,
        territoryCount: 5,
        remainingSlots: 0,
        monthlyAppointmentGoal: 60,
        goal: "territory",
      });
      expect(planRank(r.plan)).toBeLessThanOrEqual(3);
      expect(r.cappedByGuard).toBe(true);
    }
  });

  it("is monotonic in score for several attribute sets", () => {
    const sets = [
      {},
      { city: "Laval", category: "plomberie" },
      { reviewCount: 200, googleRating: 4.8, city: "Montréal", category: "toiture" },
      { competitorCount: 30, territoryCount: 4, remainingSlots: 0 },
      { monthlyAppointmentGoal: 25, city: "Québec", category: "isolation" },
    ];
    for (const attrs of sets) {
      expect(assertMonotonic(attrs)).toEqual({ ok: true });
    }
  });

  it("reserves Domination for confirmed dominant signals only", () => {
    expect(recommendPlan({ visibilityScore: 92 }).plan).not.toBe("domination");
    const dominant = recommendPlan({
      visibilityScore: 92,
      reviewCount: 400,
      googleRating: 4.8,
      city: "Montréal",
      category: "toiture",
      remainingSlots: 0,
    });
    expect(dominant.plan).toBe("domination");
  });

  it("falls back to the mid plan when confidence is insufficient", () => {
    const r = recommendPlan({ visibilityScore: null });
    expect(planRank(r.plan)).toBeLessThanOrEqual(3);
    expect(r.plan).not.toBe("domination");
  });

  it("capacity-first path stays sensible and never tops out blindly", () => {
    expect(planRank(recommendPlanFromCapacity(2).plan))
      .toBeLessThanOrEqual(planRank(recommendPlanFromCapacity(30).plan));
    expect(recommendPlanFromCapacity(2).plan).not.toBe("domination");
  });

  it("always returns an explainable rationale", () => {
    const r = recommendPlan({ visibilityScore: 50, city: "Laval", category: "plomberie" });
    expect(r.rationale.length).toBeGreaterThan(10);
    expect(r.factors.length).toBeGreaterThan(0);
  });
});
