import { describe, expect, it } from "vitest";
import {
  appointmentOutcome, goalNeeds, goalQuotePatch, goalSignature, initialAppointments, normalizeSizeMix, quebecTaxes, validateGoal, weightedEconomics,
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
  it("sans répartition = hypothèse unique", () => {
    expect(weightedEconomics(base)).toEqual({ basket: 3000, conversionPct: 25, expectedValuePerAppointment: 750, source: "single_hypothesis" });
  });
  it("répartition hétérogène : Σ w·b·c (750 $/RDV), jamais moyenne × moyenne (1 650 $)", () => {
    const eco = weightedEconomics({ ...base, sizes: [
      { code: "small", basket: 1000, sharePct: 50, conversionPct: 50, stance: "accepted" },
      { code: "large", basket: 10000, sharePct: 50, conversionPct: 10, stance: "sought" },
      { code: "medium", basket: 999999, sharePct: 90, conversionPct: 90, stance: "refused" },
    ] });
    expect(eco.source).toBe("declared_mix");
    expect(eco.expectedValuePerAppointment).toBeCloseTo(750, 9);
    expect(eco.conversionPct).toBeCloseTo(30, 9);
    expect(eco.basket).toBeCloseTo(2500, 9); // valeur d'un contrat gagné
    expect((eco.basket as number) * (eco.conversionPct as number) / 100).toBeCloseTo(750, 9);
  });
  it("répartition invalide : erreurs visibles, aucun repli sur l'hypothèse unique", () => {
    const bad = { ...base, sizes: [
      { code: "small" as const, basket: 1000, sharePct: 50, conversionPct: 150, stance: "accepted" as const },
      { code: "large" as const, basket: 0, sharePct: 30, conversionPct: 10, stance: "sought" as const },
    ] };
    const errs = validateGoal(bad);
    expect(errs).toEqual(expect.arrayContaining(["invalid_size_conversion", "invalid_size_basket", "size_mix_total"]));
    expect(weightedEconomics(bad).basket).toBeNull();
    expect(goalNeeds(bad)).toBeNull();
    const short = { ...base, sizes: [{ code: "small" as const, basket: 1000, sharePct: 60, conversionPct: 50 }, { code: "large" as const, basket: 9000, sharePct: 20, conversionPct: 10 }] };
    expect(validateGoal(short)).toEqual(["size_mix_total"]);
    const norm = normalizeSizeMix(short.sizes);
    expect(norm[0].sharePct).toBeCloseTo(75, 9);
    expect(norm[1].sharePct).toBeCloseTo(25, 9);
    expect(validateGoal({ ...short, sizes: norm })).toEqual([]);
    expect(validateGoal({ ...base, sizes: [{ code: "small", stance: "accepted", minValue: 5000, maxValue: 1000 }] })).toContain("invalid_size_range");
  });
  it("objectif avec répartition : contrats et RDV dérivés des mêmes valeurs que le devis", () => {
    const i = { ...base, amount: 100000, sizes: [
      { code: "small" as const, basket: 1000, sharePct: 50, conversionPct: 50, stance: "accepted" as const },
      { code: "large" as const, basket: 10000, sharePct: 50, conversionPct: 10, stance: "sought" as const },
    ] };
    const n = goalNeeds(i)!;
    expect(n.contractsTotal).toBe(40); // 100 000 / 2 500
    expect(n.appointmentsTotal).toBe(134); // ceil(40 / 0,30)
    const p = goalQuotePatch(i, 12);
    expect(p.average_project_value).toBeCloseTo(2500, 9);
    expect(p.close_rate_estimate).toBeCloseTo(0.3, 9);
    expect(p.project_size_mix?.share_unit).toBe("appointments");
  });
  it("horizon arbitraire : objectif de contrats envoyé par MOIS, jamais « année » codée", () => {
    const p = goalQuotePatch({ ...base, horizonMonths: 8 }, 14);
    expect(p.contract_goal_unit).toBe("month");
    expect(p.contract_goal_value).toBeCloseTo(40 / 8, 9);
    expect(p.horizon_contracts_total).toBe(40);
  });
  it("changement de taille pour le jumelage seulement : le devis devient périmé", () => {
    const a = goalQuotePatch({ ...base, sizes: [{ code: "large", stance: "accepted" }] }, 14);
    const b = goalQuotePatch({ ...base, sizes: [{ code: "large", stance: "refused" }] }, 14);
    expect(goalSignature(a)).not.toBe(goalSignature(b));
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
