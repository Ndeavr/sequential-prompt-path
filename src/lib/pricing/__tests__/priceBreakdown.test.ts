import { describe, it, expect } from "vitest";
import {
  buildBreakdownLines,
  breakdownIsExact,
  resolvePriceIdentity,
  type QuoteLike,
} from "../priceBreakdown";

const cappedQuote: QuoteLike = {
  target_monthly_appointments: 100,
  base_platform_fee: 99900,
  appointment_package_fee: 844800,
  aipp_optimization_fee: 9900,
  exclusivity_fee: 0,
  recommended_monthly_price: 149900,
  breakdown: {
    price_identity: {
      target_appointments: 100,
      base_platform_cents: 99900,
      appointment_package_cents: 844800,
      exclusivity_cents: 0,
      aipp_cents: 9900,
      subtotal_cents: 954600,
      market_multiplier: 1,
      override_multiplier: 1,
      raw_price_cents: 954600,
      adjustment_cents: 149900 - 954600,
      adjustment_reason: "plafond_plan_personnalise",
      final_price_cents: 149900,
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
          subtotal_cents: 76800,
        },
      },
    });
    const apptLine = lines.find((l) => l.label.includes("Rendez-vous"))!;
    expect(apptLine.label).toContain("4 visés");
    expect(apptLine.label).not.toContain("100");
  });

  it("la somme des lignes égale exactement le total final (cas plafonné)", () => {
    expect(sumCents(cappedQuote)).toBe(149900);
    expect(breakdownIsExact(cappedQuote)).toBe(true);
  });

  it("expose le plafond comme ligne visible et négative", () => {
    const line = buildBreakdownLines(cappedQuote).find((l) => l.kind === "adjustment")!;
    expect(line.label).toBe("Plafond plan personnalisé");
    expect(line.cents).toBe(149900 - 954600);
  });

  it("n'affiche aucun ajustement quand aucun plafond ne s'applique", () => {
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
