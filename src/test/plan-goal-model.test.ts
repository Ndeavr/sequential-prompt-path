import { describe, expect, it } from "vitest";
import {
  appointmentOutcome, goalNeeds, goalQuotePatch, goalSignature, initialAppointments, quebecTaxes, validateGoal, weightedEconomics,
  type GoalInputs,
} from "@/lib/pricing/planGoalModel";

const base: GoalInputs = {
  kind: "sales", amount: 120000, horizonMonths: 12, basket: 3000, conversionPct: 25, marginPct: null,
  capacityPerMonth: 20, appointmentsPerMonth: null, sizes: [],
};

describe("objectif → contrats → rendez-vous (unités explicites)", () => {
  it("120 000 $ sur 12 mois, panier 3 000 $, 25 % : 40 contrats, 160 RDV/an, ~14 RDV/mois", () => {
    const n = goalNeeds(base)!;
    expect(n.contractsTotal).toBe(40);
    expect(n.appointmentsTotal).toBe(160);
    expect(n.appointmentsPerMonthNeeded).toBe(14);
    expect(n.capacityGap).toBe(0);
    expect(n.expectedValuePerAppointment).toBe(750);
  });
  it("20 RDV/mois → 5 contrats/mois et 15 000 $ de chiffre d'affaires estimé par mois", () => {
    const o = appointmentOutcome(base, 20)!;
    expect(o.contractsPerMonth).toBe(5);
    expect(o.estimatedRevenuePerMonth).toBe(15000);
    expect(o.estimatedProfitPerMonth).toBeNull();
  });
  it("capacité insuffisante : écart signalé, curseur plafonné, jamais gonflé", () => {
    const i = { ...base, capacityPerMonth: 10 };
    expect(goalNeeds(i)!.capacityGap).toBe(4);
    expect(initialAppointments(i)).toBe(10);
    const p = goalQuotePatch(i, 10);
    expect(p.monthly_capacity).toBe(10);
    expect(p.target_monthly_appointments).toBe(10);
    expect(p.capacity_gap).toEqual({ needed_per_month: 14, capacity_per_month: 10 });
  });
  it("profit : marge obligatoire; valeurs invalides refusées", () => {
    expect(validateGoal({ ...base, kind: "profit" })).toContain("missing_margin");
    expect(validateGoal({ ...base, kind: "profit", marginPct: 0 })).toContain("invalid_margin");
    expect(goalNeeds({ ...base, kind: "profit", marginPct: 25 })!.contractsTotal).toBe(160);
    expect(validateGoal({ ...base, amount: 0 })).toContain("invalid_amount");
    expect(validateGoal({ ...base, amount: -5 })).toContain("invalid_amount");
    expect(validateGoal({ ...base, conversionPct: 0 })).toContain("invalid_conversion");
    expect(validateGoal({ ...base, conversionPct: 120 })).toContain("invalid_conversion");
    expect(validateGoal({ ...base, horizonMonths: 0 })).toContain("invalid_horizon");
    expect(validateGoal({ ...base, capacityPerMonth: 0 })).toContain("invalid_capacity");
  });
  it("répartition déclarée pondère panier et conversion; taille refusée exclue; sans répartition = hypothèse unique", () => {
    expect(weightedEconomics(base)).toEqual({ basket: 3000, conversionPct: 25, source: "single_hypothesis" });
    const mixed = weightedEconomics({ ...base, sizes: [
      { code: "small", basket: 2000, sharePct: 50, conversionPct: 40, stance: "accepted" },
      { code: "medium", basket: 6000, sharePct: 50, conversionPct: 20, stance: "sought" },
      { code: "large", basket: 50000, sharePct: 90, stance: "refused" },
    ] });
    expect(mixed).toEqual({ basket: 4000, conversionPct: 30, source: "declared_mix" });
  });
  it("signature : un devis n'est lié qu'aux mêmes entrées", () => {
    const a = goalQuotePatch(base, 14);
    expect(goalSignature(a)).toBe(goalSignature({ ...a }));
    expect(goalSignature(a)).not.toBe(goalSignature(goalQuotePatch(base, 15)));
  });
});

describe("taxes du Québec au cent", () => {
  it("500 $ : TPS 25,00 $ + TVQ 49,88 $ = 574,88 $", () => expect(quebecTaxes(50000)).toEqual({ gst: 2500, qst: 4988, total: 57488 }));
  it("350 $ : TPS 17,50 $ + TVQ 34,91 $ = 402,41 $", () => expect(quebecTaxes(35000)).toEqual({ gst: 1750, qst: 3491, total: 40241 }));
});
