import { describe, it, expect } from "vitest";
import { buildCommercialLines, type QuoteLike } from "../priceBreakdown";

/** Toiture, Montréal : 12 rendez-vous exclusifs, rabais de volume 5 %. */
const roofingQuote: QuoteLike = {
  target_monthly_appointments: 12,
  base_platform_fee: 29900,
  appointment_package_fee: 132600,
  aipp_optimization_fee: 9700,
  exclusivity_fee: 0,
  recommended_monthly_price: 165570,
  breakdown: {
    price_identity: {
      target_appointments: 12,
      base_platform_cents: 29900,
      appointment_unit_price_cents: 11050,
      appointment_unit_status: "benchmark_trade_market",
      extra_appointments: 12,
      volume_discount_rate: 0.05,
      volume_discount_cents: -6630,
      appointment_package_cents: 132600,
      exclusivity_cents: 0,
      aipp_cents: 9700,
      subtotal_cents: 165570,
      market_multiplier: 1,
      override_multiplier: 1,
      raw_price_cents: 165570,
      adjustment_cents: 0,
      adjustment_reason: null,
      final_price_cents: 165570,
    },
  },
};

describe("détail commercial du plan", () => {
  it("n'affiche que des notions compréhensibles", () => {
    const { lines } = buildCommercialLines(roofingQuote, {
      trade: "toiture",
      city: "Montréal",
      plan_label: "Croissance",
    });
    const labels = lines.map((l) => l.label).join(" | ");
    expect(labels).toContain("Abonnement UNPRO");
    expect(labels).toContain("12 rendez-vous exclusifs en toiture, Montréal");
    expect(labels).toContain("Visibilité IA");
    for (const forbidden of ["Sous-total", "Multiplicateur", "Plafond", "Ajustement", "cap"]) {
      expect(labels).not.toContain(forbidden);
    }
  });

  it("affiche le prix unitaire du métier et le rabais de volume en note", () => {
    const { lines } = buildCommercialLines(roofingQuote, { trade: "toiture" });
    const appt = lines.find((l) => l.label.includes("rendez-vous"))!;
    expect(appt.sublabel).toContain("111 $ par rendez-vous");
    expect(appt.sublabel).toContain("−5 %");
    expect(appt.cents).toBe(132600 - 6630);
  });

  it("la somme des lignes égale toujours le montant facturé", () => {
    const { lines, total_cents } = buildCommercialLines(roofingQuote);
    expect(lines.reduce((s, l) => s + l.cents, 0)).toBe(total_cents);
    expect(total_cents).toBe(165570);
  });

  it("un budget choisi explique le volume, sans jamais montrer de réduction", () => {
    const { lines, budget_note, total_cents } = buildCommercialLines(roofingQuote, {
      monthly_budget_cents: 165570,
      guaranteed_appointments: 12,
    });
    expect(budget_note).toContain("12 rendez-vous exclusifs");
    expect(lines.some((l) => l.cents < 0)).toBe(false);
    expect(total_cents).toBe(165570);
  });

  it("sans tarif fiable pour le métier, aucun volume n'est vendu", () => {
    const summary = buildCommercialLines({
      target_monthly_appointments: 6,
      base_platform_fee: 29900,
      appointment_package_fee: 0,
      aipp_optimization_fee: 0,
      exclusivity_fee: 0,
      recommended_monthly_price: 29900,
      breakdown: {
        price_identity: {
          target_appointments: 6,
          base_platform_cents: 29900,
          appointment_unit_status: "unavailable",
          extra_appointments: 0,
          appointment_package_cents: 0,
          exclusivity_cents: 0,
          aipp_cents: 0,
          subtotal_cents: 29900,
          market_multiplier: 1,
          raw_price_cents: 29900,
          adjustment_cents: 0,
          adjustment_reason: null,
          final_price_cents: 29900,
        },
      },
    });
    expect(summary.appointments_unavailable).toBe(true);
    expect(summary.lines).toHaveLength(1);
    expect(summary.total_cents).toBe(29900);
  });

  it("le total commercial est toujours le montant envoyé au paiement", () => {
    // Même si les composantes internes ne se recomposent pas parfaitement,
    // l'entrepreneur voit et paie exactement recommended_monthly_price.
    const drifted: QuoteLike = {
      ...roofingQuote,
      recommended_monthly_price: 159900,
      breakdown: {
        price_identity: {
          ...roofingQuote.breakdown!.price_identity!,
          final_price_cents: 159900,
        },
      },
    };
    const { lines, total_cents } = buildCommercialLines(drifted);
    expect(total_cents).toBe(159900);
    expect(lines.reduce((s, l) => s + l.cents, 0)).toBe(159900);
  });
});
