import { describe, it, expect } from "vitest";
import {
  scanProhibitedClaims,
  UNPRO_SELECTION_STATEMENT,
  UNPRO_REGULATED_DISCLOSURE,
  COMPENSATION_TYPES,
} from "@/lib/compliance/professionCompliance";

describe("prohibited advertising claims", () => {
  it("blocks unverifiable superlatives", () => {
    for (const claim of [
      "Le meilleur couvreur de Montréal",
      "Courtier #1 au Québec",
      "Numéro un en assurance",
      "The best broker in town",
    ]) {
      const r = scanProhibitedClaims(claim);
      expect(r.clean).toBe(false);
      expect(r.matches.length).toBeGreaterThan(0);
    }
  });

  it("blocks implied regulator endorsement", () => {
    const r = scanProhibitedClaims("Professionnel recommandé par l'AMF");
    expect(r.clean).toBe(false);
    expect(r.sanitized).not.toMatch(/recommandé par l'AMF/i);
  });

  it("accepts evidence-based selection language", () => {
    expect(scanProhibitedClaims(UNPRO_SELECTION_STATEMENT).clean).toBe(true);
    expect(scanProhibitedClaims(UNPRO_REGULATED_DISCLOSURE).clean).toBe(true);
    expect(
      scanProhibitedClaims("Disponible cette semaine à Laval, licence RBQ active.").clean,
    ).toBe(true);
  });

  it("applies profession-specific prohibited claims from the rule", () => {
    const r = scanProhibitedClaims("Nous offrons la meilleure prime du marché", ["meilleure prime"]);
    expect(r.clean).toBe(false);
  });
});

describe("compensation catalogue", () => {
  it("covers every supported monetization structure", () => {
    expect(COMPENSATION_TYPES).toEqual([
      "membership_monthly",
      "membership_annual",
      "listing_subscription",
      "appointment_fee_fixed",
      "referral_fee_fixed",
      "success_fee",
      "percentage_commission",
      "affiliate_commission",
    ]);
  });
});
