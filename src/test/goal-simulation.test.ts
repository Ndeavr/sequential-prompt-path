import { describe, it, expect } from "vitest";
import { simulateGoal, objectiveToPayload } from "@/pages/contractor-funnel/PageContractorPricingIntake";

const base = { goal_amount: 1_000_000, avg_sale: 9800, conversion_pct: 35, horizon: "12m" } as any;

describe("simulateGoal", () => {
  it("mode ventes : 103 contrats, 295 RDV", () => {
    const r = simulateGoal({ ...base, goal_kind: "sales" });
    expect(r.ok && [r.contracts, r.appointmentsTotal, r.cadence]).toEqual([103, 295, 25]);
  });
  it("mode profit 30 % : 341 contrats, 975 RDV, ~82/mois", () => {
    const r = simulateGoal({ ...base, goal_kind: "profit", margin_pct: 30 });
    expect(r.ok && [r.contracts, r.appointmentsTotal, r.cadence]).toEqual([341, 975, 82]);
    expect(r.ok && r.estimatedProfit).toBeGreaterThanOrEqual(1_000_000);
  });
  it("profit sans marge → demande la marge, aucun chiffre", () => {
    const r = simulateGoal({ ...base, goal_kind: "profit" });
    expect(r).toEqual({ ok: false, reason: "missing_margin" });
    expect(objectiveToPayload({ ...base, goal_kind: "profit", next_month_appointments: 5 })).toBeNull();
  });
  it("profit marge 0 % → invalide (pas de division par zéro)", () => {
    expect(simulateGoal({ ...base, goal_kind: "profit", margin_pct: 0 })).toEqual({ ok: false, reason: "invalid_margin" });
  });
  it("profit marge 100 % = ventes", () => {
    const r = simulateGoal({ ...base, goal_kind: "profit", margin_pct: 100 });
    expect(r.ok && r.contracts).toBe(103);
  });
  it("vente 0 ou conversion 0 → invalide", () => {
    expect(simulateGoal({ ...base, avg_sale: 0 }).ok).toBe(false);
    expect(simulateGoal({ ...base, conversion_pct: 0 }).ok).toBe(false);
  });
  it("ventes : marge facultative mais donne le profit estimé", () => {
    const r = simulateGoal({ ...base, goal_kind: "sales", margin_pct: 30 });
    expect(r.ok && r.estimatedProfit).toBe(Math.round(103 * 9800 * 0.3));
  });
  it("horizon fin d'année répartit sur les mois restants", () => {
    const r = simulateGoal({ ...base, goal_kind: "sales", horizon: "year_end" }, new Date(2026, 9, 11));
    expect(r.ok && [r.months, r.cadence]).toEqual([2, 148]);
  });
});
