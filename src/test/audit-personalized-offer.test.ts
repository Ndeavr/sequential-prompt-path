import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  recommendPlanFromScore,
  recommendationReason,
} from "@/components/entrepreneur/AuditPersonalizedOfferCard";
import { PUBLIC_CONTRACTOR_PLANS } from "@/config/pricing";
import { buildAppointmentGuarantee } from "@/lib/pricing/appointmentGuarantee";

describe("offre personnalisée après le score IA", () => {
  it("recommande un forfait réel du catalogue pour chaque score", () => {
    for (const score of [0, 12, 34, 35, 50, 69, 70, 99, 100]) {
      const slug = recommendPlanFromScore(score);
      const plan = PUBLIC_CONTRACTOR_PLANS.find((p) => p.slug === slug);
      expect(plan, `plan introuvable pour ${score}`).toBeTruthy();
      expect(plan!.free).not.toBe(true);
      expect(plan!.monthlyPrice).toBeGreaterThan(0);
    }
  });

  it("cite le score réel dans la recommandation, sans chiffre inventé", () => {
    const reason = recommendationReason(21, "Laval");
    expect(reason).toContain("21 / 100");
    expect(reason).toContain("Laval");
  });

  it("exprime la garantie sur 12 mois pour chaque forfait payant", () => {
    for (const plan of PUBLIC_CONTRACTOR_PLANS.filter((p) => !p.free)) {
      const g = buildAppointmentGuarantee(plan.appointmentsIncluded);
      expect(g.status).toBe("known");
      expect(g.annualGuarantee).toBe(plan.appointmentsIncluded * 12);
      expect(g.guaranteeLabel).toContain("12 mois");
    }
  });
});

describe("audit offer checkout telemetry integrity", () => {
  it("records Stripe checkout only after the server returns a session URL, not on click or intake", () => {
    const source = readFileSync("src/components/entrepreneur/AuditPersonalizedOfferCard.tsx", "utf8");
    const start = source.indexOf("const startCheckout = async () => {");
    const quoteHandoff = source.indexOf("if (!quoteId)", start);
    const validatedUrl = source.indexOf('if (!payload?.url) throw', start);
    const checkoutEvent = source.indexOf('event_type: "stripe_checkout_started"', start);
    const redirect = source.indexOf("redirectToCheckout(payload.url)", start);
    expect(start).toBeGreaterThan(0);
    expect(quoteHandoff).toBeGreaterThan(start);
    expect(validatedUrl).toBeGreaterThan(quoteHandoff);
    expect(checkoutEvent).toBeGreaterThan(validatedUrl);
    expect(redirect).toBeGreaterThan(checkoutEvent);
  });

  it("does not leak tokens, audit IDs or raw provider errors into funnel telemetry", () => {
    const source = readFileSync("src/components/entrepreneur/AuditPersonalizedOfferCard.tsx", "utf8");
    const start = source.indexOf("const startCheckout = async () => {");
    const eventSection = source.slice(start, source.indexOf("  return (", start));
    expect(eventSection).not.toContain('event_type: "stripe_payment_failed"');
    expect(eventSection).not.toContain("reason: e instanceof Error");
    expect(eventSection).not.toContain("metadata: { audit_id:");
    expect(eventSection).toContain('event_type: "activation_error"');
    expect((eventSection.match(/suppress_prospect_ref: true/g) ?? []).length).toBe(2);
    expect((eventSection.match(/token: ""/g) ?? []).length).toBe(2);
  });
});
