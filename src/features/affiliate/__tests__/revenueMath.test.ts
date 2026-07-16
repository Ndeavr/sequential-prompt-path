import { describe, it, expect } from "vitest";
import {
  monthlyCommission,
  annualCommission,
  lifetimeCommission,
  breakdownForPlan,
  breakdownAllPlans,
  aggregatePipeline,
  recommendPlan,
} from "../revenueMath";

describe("revenueMath — commission math", () => {
  it("computes monthly commission (Pro 349 × 20%)", () => {
    expect(monthlyCommission(349, 0.2)).toBe(69.8);
  });
  it("computes annual commission (Pro 349 × 12 × 20%)", () => {
    expect(annualCommission(349, 0.2)).toBe(837.6);
  });
  it("computes lifetime commission (Pro 349 × 20% × 24)", () => {
    expect(lifetimeCommission(349, 0.2, 24)).toBe(1675.2);
  });

  it("breakdownForPlan(pro) matches spec", () => {
    const b = breakdownForPlan("pro", 0.2, 24);
    expect(b.monthlyPrice).toBe(349);
    expect(b.monthlyCommission).toBe(69.8);
    expect(b.annualCommission).toBe(837.6);
    expect(b.lifetimeCommission).toBe(1675.2);
  });

  it("breakdownAllPlans returns 5 plans", () => {
    const rows = breakdownAllPlans(0.2);
    expect(rows).toHaveLength(5);
    const premium = rows.find((r) => r.slug === "premium")!;
    expect(premium.monthlyCommission).toBe(119.8);
    expect(premium.annualCommission).toBe(1437.6);
  });

  it("aggregatePipeline sums recommended plans", () => {
    const t = aggregatePipeline(["pro", "pro", "premium"], 0.2, 24);
    // 349*0.2 + 349*0.2 + 599*0.2 = 69.8 + 69.8 + 119.8 = 259.4
    expect(t.count).toBe(3);
    expect(t.potentialMonthly).toBe(259.4);
    expect(t.potentialAnnual).toBe(3112.8);
    expect(t.potentialLifetime).toBe(6225.6);
  });
});

describe("revenueMath — plan recommender", () => {
  it("recommends signature for elite market signal", () => {
    expect(
      recommendPlan({ reviewCount: 600, territorySize: "large", demandLevel: "high" }).slug,
    ).toBe("signature");
  });
  it("recommends elite for 300+ reviews, multi-city, high demand", () => {
    expect(
      recommendPlan({ reviewCount: 320, territorySize: "medium", demandLevel: "high" }).slug,
    ).toBe("elite");
  });
  it("recommends premium for 150+ reviews", () => {
    expect(recommendPlan({ reviewCount: 200 }).slug).toBe("premium");
  });
  it("recommends pro for a decent score, few reviews", () => {
    expect(recommendPlan({ reviewCount: 40, unproScore: 68 }).slug).toBe("pro");
  });
  it("falls back to recrue for weak profiles", () => {
    expect(recommendPlan({ reviewCount: 2, unproScore: 30 }).slug).toBe("recrue");
  });
});
