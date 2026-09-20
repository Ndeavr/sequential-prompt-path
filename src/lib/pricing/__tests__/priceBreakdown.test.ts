import { describe, it, expect } from "vitest";
import {
  buildBreakdownLines,
  breakdownIsExact,
  resolvePriceIdentity,
  type QuoteLike,
} from "../priceBreakdown";

/** Volume réel de 100 rendez-vous : facturé à son vrai prix, avec rabais de volume affiché. */
const highVolumeQuote: QuoteLike = {
  target_monthly_appointments: 100,
  base_platform_fee: 99900,
  appointment_package_fee: 844800,
  aipp_optimization_fee: 9900,
  exclusivity_fee: 0,
  recommended_monthly_price: 785640,
  breakdown: {
    price_identity: {
      target_appointments: 100,
      base_platform_cents: 99900,
      appointment_unit_price_cents: 8800,
      extra_appointments: 96,
      volume_discount_rate: 0.2,
      volume_discount_cents: -168960,
      appointment_package_cents: 844800,
      exclusivity_cents: 0,
      aipp_cents: 9900,
      subtotal_cents: 785640,
      market_multiplier: 1,
      override_multiplier: 1,
      raw_price_cents: 785640,
      adjustment_cents: 0,
      adjustment_reason: null,
      final_price_cents: 785640,
    },
  },
};

const smallGoalQuote: QuoteLike = {
  target_monthly_appointments: 4,
  base_platform_fee: 59900,
  appointment_package_fee: 0,
  aipp_optimization_fee: 4900,
  exclusivity_fee: 0,
  recommended_monthly_price: 72576,
  breakdown: {
    price_identity: {
      target_appointments: 4,
      base_platform_cents: 59900,
      appointment_package_cents: 0,
      exclusivity_cents: 0,
      aipp_cents: 4900,
      subtotal_cents: 64800,
      market_multiplier: 1.12,
      override_multiplier: 1,
      raw_price_cents: 72576,
      adjustment_cents: 0,
      adjustment_reason: null,
      final_price_cents: 72576,
    },
  },
};

const sumCents = (q: QuoteLike) => {
  const lines = buildBreakdownLines(q);
  const id = resolvePriceIdentity(q);
  const adjustment = lines.find((l) => l.kind === "adjustment")?.cents ?? 0;
  return Math.round(id.subtotal_cents * id.market_multiplier * (id.override_multiplier ?? 1)) +
    adjustment;
};

describe("détail transparent du plan personnalisé", () => {
  it("affiche l'objectif confirmé (4), jamais une valeur par défaut", () => {
    const lines = buildBreakdownLines({
      ...smallGoalQuote,
      appointment_package_fee: 12000,
      breakdown: {
        price_identity: {
          ...smallGoalQuote.breakdown!.price_identity!,
          appointment_package_cents: 12000,
          extra_appointments: 4,
          subtotal_cents: 76800,
        },
      },
    });
    const apptLine = lines.find((l) => l.label.includes("Rendez-vous"))!;
    expect(apptLine.label).toContain("4");
    expect(apptLine.label).not.toContain("100");
  });

  it("facture le vrai prix d'un gros volume : aucun plafond mensuel caché", () => {
    const lines = buildBreakdownLines(highVolumeQuote);
    expect(lines.find((l) => l.kind === "adjustment")).toBeUndefined();
    expect(lines.some((l) => l.label.includes("Plafond"))).toBe(false);
    expect(sumCents(highVolumeQuote)).toBe(785640);
    expect(breakdownIsExact(highVolumeQuote)).toBe(true);
  });

  it("affiche le rabais de volume comme ligne visible et négative", () => {
    const line = buildBreakdownLines(highVolumeQuote).find((l) => l.kind === "discount")!;
    expect(line.label).toContain("Rabais de volume");
    expect(line.cents).toBe(-168960);
  });

  it("affiche le prix unitaire du métier sur la ligne des rendez-vous", () => {
    const line = buildBreakdownLines(highVolumeQuote).find((l) => l.label.includes("Rendez-vous"))!;
    expect(line.label).toContain("88 $ chacun");
  });

  it("nomme un budget mensuel choisi au lieu d'un plafond", () => {
    const budgetQuote: QuoteLike = {
      ...smallGoalQuote,
      recommended_monthly_price: 149900,
      breakdown: {
        price_identity: {
          ...smallGoalQuote.breakdown!.price_identity!,
          adjustment_cents: 149900 - 72576,
          adjustment_reason: "budget_mensuel_choisi",
          final_price_cents: 149900,
        },
      },
    };
    const line = buildBreakdownLines(budgetQuote).find((l) => l.kind === "adjustment")!;
    expect(line.label).toBe("Budget mensuel choisi");
  });

  it("n'affiche aucun ajustement quand rien ne s'applique", () => {
    const lines = buildBreakdownLines(smallGoalQuote);
    expect(lines.find((l) => l.kind === "adjustment")).toBeUndefined();
    expect(sumCents(smallGoalQuote)).toBe(72576);
  });

  it("reste identique après un rechargement (fonction pure du dossier)", () => {
    expect(buildBreakdownLines(smallGoalQuote)).toEqual(buildBreakdownLines(smallGoalQuote));
    expect(resolvePriceIdentity(smallGoalQuote).target_appointments).toBe(4);
  });

  it("reconstruit une identité exacte pour un devis ancien sans price_identity", () => {
    const legacy: QuoteLike = {
      target_monthly_appointments: 4,
      base_platform_fee: 59900,
      appointment_package_fee: 0,
      aipp_optimization_fee: 4900,
      exclusivity_fee: 0,
      recommended_monthly_price: 64800,
      breakdown: null,
    };
    expect(resolvePriceIdentity(legacy).target_appointments).toBe(4);
    expect(breakdownIsExact(legacy)).toBe(true);
  });
});
