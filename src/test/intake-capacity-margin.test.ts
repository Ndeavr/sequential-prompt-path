import { describe, it, expect } from "vitest";
import { capacityBounds, capacityWarning, objectiveToPayload } from "@/pages/contractor-funnel/PageContractorPricingIntake";

describe("Capacité par plage et marge", () => {
  it("10 à 15 : borne basse prudente 10, jamais 12", () => {
    expect(capacityBounds({ capacity_range: "10-15", next_month_appointments: 10 })).toEqual({ min: 10, max: 15, label: "10 à 15", isRange: true });
  });
  it("besoin 14 avec plage 10-15 : avertissement bas de plage", () => {
    expect(capacityWarning(14, { min: 10, max: 15, isRange: true })).toBe("low_end");
    expect(capacityWarning(21, { min: 16, max: 20, isRange: true })).toBe("insufficient");
    expect(capacityWarning(9, { min: 10, max: 15, isRange: true })).toBe("ok");
  });
  it("Autre : valeur exacte saisie", () => {
    expect(capacityBounds({ capacity_range: "other", next_month_appointments: 7 })).toEqual({ min: 7, max: 7, isRange: false });
  });
  it("champs UI absents du payload, calcul profit 35 % exact", () => {
    const r = objectiveToPayload({ goal_kind: "profit", goal_amount: 100000, avg_sale: 4500, conversion_pct: 40, margin_pct: 35, margin_other: false, capacity_range: "10-15", next_month_appointments: 10, horizon: "12m" } as any)!;
    expect(r.contracts).toBe(Math.ceil(100000 / (4500 * 0.35)));
    expect(r.startAppointments).toBe(10);
    expect(r.payload).not.toHaveProperty("capacity_range");
    expect(r.payload).not.toHaveProperty("margin_other");
  });
});
