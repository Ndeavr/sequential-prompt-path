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
import { CONTRACTOR_PLANS, getContractorPlan } from "@/config/contractorPlans";

// Prices are NEVER hardcoded here — canonical source: src/config/contractorPlans.ts
const PRO = getContractorPlan("pro")!.monthlyPrice;
const PREMIUM = getContractorPlan("premium")!.monthlyPrice;
const r2 = (n: number) => Math.round(n * 100) / 100;

describe("revenueMath — commission math", () => {
  it("computes monthly commission (price × 20%)", () => {
    expect(monthlyCommission(349, 0.2)).toBe(69.8);
  });
  it("computes annual commission (Pro 349 × 12 × 20%)", () => {
    expect(annualCommission(349, 0.2)).toBe(837.6);
  });
  it("computes lifetime commission (Pro 349 × 20% × 24)", () => {
    expect(lifetimeCommission(349, 0.2, 24)).toBe(1675.2);
  });

  it("breakdownForPlan(pro) matches the canonical catalog", () => {
    const b = breakdownForPlan("pro", 0.2, 24);
    expect(b.monthlyPrice).toBe(PRO);
    expect(b.monthlyCommission).toBe(r2(PRO * 0.2));
    expect(b.annualCommission).toBe(r2(PRO * 12 * 0.2));
    expect(b.lifetimeCommission).toBe(r2(PRO * 0.2 * 24));
  });

  it("breakdownAllPlans covers every canonical plan", () => {
    const rows = breakdownAllPlans(0.2);
    expect(rows).toHaveLength(CONTRACTOR_PLANS.length);
    const premium = rows.find((r) => r.slug === "premium")!;
    expect(premium.monthlyCommission).toBe(r2(PREMIUM * 0.2));
    expect(premium.annualCommission).toBe(r2(PREMIUM * 12 * 0.2));
  });

  it("aggregatePipeline sums recommended plans", () => {
    const t = aggregatePipeline(["pro", "pro", "premium"], 0.2, 24);
    expect(t.count).toBe(3);
    expect(t.potentialMonthly).toBe(r2((PRO + PRO + PREMIUM) * 0.2));
    expect(t.potentialAnnual).toBe(r2((PRO + PRO + PREMIUM) * 12 * 0.2));
    expect(t.potentialLifetime).toBe(r2((PRO + PRO + PREMIUM) * 0.2 * 24));
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
