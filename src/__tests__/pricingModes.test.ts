import { describe, it, expect } from "vitest";
import {
  DEFAULT_MARGIN_CONFIG,
  evaluateMargin,
  marginConfigFrom,
  solveBudget,
  type PricedTarget,
} from "../../supabase/functions/_shared/pricingModes";

/** Fake canonical chain: 4900 base + 9000 per appointment. */
const priceFn = (perAppt = 9000, base = 4900) =>
  (target: number): PricedTarget => ({
    target,
    plan_code: target >= 10 ? "elite_v2" : target >= 4 ? "pro_v2" : "presence_v2",
    monthly_price_cents: base + target * perAppt,
    capacity_capped: false,
  });

const cfg = DEFAULT_MARGIN_CONFIG;

describe("margin evaluation", () => {
  it("refuses guarantees under the minimum margin", () => {
    const m = evaluateMargin(10000, 3, cfg); // cost = 3*2900 + 1500 = 10200
    expect(m.margin_cents).toBeLessThan(0);
    expect(m.meets_minimum).toBe(false);
  });

  it("accepts healthy margins", () => {
    const m = evaluateMargin(59900, 4, cfg);
    expect(m.meets_minimum).toBe(true);
  });

  it("reads config overrides, falling back to defaults", () => {
    const c = marginConfigFrom({ min_margin_ratio: 0.5, appointment_delivery_cost_cents: "x" });
    expect(c.min_margin_ratio).toBe(0.5);
    expect(c.appointment_delivery_cost_cents).toBe(cfg.appointment_delivery_cost_cents);
  });
});

describe("solveBudget", () => {
  it("guarantees only what the budget really pays for", () => {
    const r = solveBudget(
      { monthly_budget_cents: 75000, market_ceiling: 50, contractor_capacity: 50, market_unavailable: false, margin: cfg },
      priceFn(),
    );
    // 4900 + 7*9000 = 67900 ≤ 75000 ; 8 would be 76900 > budget
    expect(r.guaranteed_appointments).toBe(7);
    expect(r.priced?.monthly_price_cents).toBe(67900);
    expect(r.outcome).toBe("budget_resolved");
    expect(r.unused_budget_cents).toBe(75000 - 67900);
  });

  it("never inflates the price to the budget", () => {
    const r = solveBudget(
      { monthly_budget_cents: 250000, market_ceiling: 6, contractor_capacity: 20, market_unavailable: false, margin: cfg },
      priceFn(),
    );
    expect(r.guaranteed_appointments).toBe(6);
    expect(r.priced!.monthly_price_cents).toBeLessThan(250000);
    expect(r.outcome).toBe("capacity_limited");
    expect(r.unused_budget_cents).toBeGreaterThan(0);
  });

  it("respects contractor declared capacity over market ceiling", () => {
    const r = solveBudget(
      { monthly_budget_cents: 250000, market_ceiling: 40, contractor_capacity: 8, market_unavailable: false, margin: cfg },
      priceFn(),
    );
    expect(r.guaranteed_appointments).toBe(8);
    expect(r.outcome).toBe("contractor_capacity_limited");
  });

  it("returns no guarantee when the budget is below the floor", () => {
    const r = solveBudget(
      { monthly_budget_cents: 5000, market_ceiling: 10, contractor_capacity: 10, market_unavailable: false, margin: cfg },
      priceFn(),
    );
    expect(r.guaranteed_appointments).toBe(0);
    expect(r.priced).toBeNull();
    expect(r.outcome).toBe("budget_below_floor");
  });

  it("never guarantees on a closed market", () => {
    const r = solveBudget(
      { monthly_budget_cents: 500000, market_ceiling: 10, contractor_capacity: 10, market_unavailable: true, margin: cfg },
      priceFn(),
    );
    expect(r.outcome).toBe("market_unavailable");
    expect(r.guaranteed_appointments).toBe(0);
  });

  it("gives different guarantees for different market economics on the same budget", () => {
    const cheap = solveBudget(
      { monthly_budget_cents: 75000, market_ceiling: null, contractor_capacity: 30, market_unavailable: false, margin: cfg },
      priceFn(6000),
    );
    const rich = solveBudget(
      { monthly_budget_cents: 75000, market_ceiling: null, contractor_capacity: 30, market_unavailable: false, margin: cfg },
      priceFn(18000),
    );
    expect(cheap.guaranteed_appointments).toBeGreaterThan(rich.guaranteed_appointments);
  });

  it("is consistent both ways: the budget of the guaranteed N covers exactly N", () => {
    const price = priceFn();
    const r = solveBudget(
      { monthly_budget_cents: 120000, market_ceiling: 40, contractor_capacity: 40, market_unavailable: false, margin: cfg },
      price,
    );
    const goalPrice = price(r.guaranteed_appointments).monthly_price_cents;
    expect(goalPrice).toBe(r.priced!.monthly_price_cents);
    expect(price(r.guaranteed_appointments + 1).monthly_price_cents).toBeGreaterThan(120000);
  });
});
