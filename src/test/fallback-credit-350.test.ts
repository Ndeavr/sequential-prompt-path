import { describe, expect, it } from "vitest";
import {
  FALLBACK_CREDIT_AMOUNT_CENTS,
  FALLBACK_CREDIT_COPY,
  detectNotReadyForPlan,
  shouldOfferFallbackCredit,
} from "@/lib/offers/fallbackCredit350";

describe("offre de repli — crédit UNPRO 350 $", () => {
  it("fixe le montant à 350 $ exactement", () => {
    expect(FALLBACK_CREDIT_AMOUNT_CENTS).toBe(35000);
  });

  it("ne présente jamais le montant comme perdu", () => {
    const text = [FALLBACK_CREDIT_COPY.title, ...FALLBACK_CREDIT_COPY.benefits, FALLBACK_CREDIT_COPY.creditNotice].join(" ").toLowerCase();
    expect(text).toContain("aucun crédit perdu");
    expect(text).not.toContain("frais non remboursables");
  });

  it.each([
    "Je vais attendre",
    "c'est trop cher pour moi",
    "je vais y penser",
    "je ne suis pas prêt",
    "je veux commencer plus petit",
    "pas maintenant",
  ])("détecte l'objection: %s", (phrase) => {
    expect(detectNotReadyForPlan(phrase).detected).toBe(true);
  });

  it("ne déclenche pas sur une intention d'achat", () => {
    expect(detectNotReadyForPlan("je veux activer mon forfait aujourd'hui").detected).toBe(false);
  });

  it("n'offre jamais le repli avant la présentation du plan", () => {
    expect(
      shouldOfferFallbackCredit({ planPresented: false, alreadyOffered: false, objectionDetected: true }),
    ).toBe(false);
  });

  it("n'offre le repli qu'une seule fois", () => {
    expect(
      shouldOfferFallbackCredit({ planPresented: true, alreadyOffered: true, objectionDetected: true }),
    ).toBe(false);
    expect(
      shouldOfferFallbackCredit({ planPresented: true, alreadyOffered: false, objectionDetected: true }),
    ).toBe(true);
  });

  it("offre le repli après un refus explicite du plan", () => {
    expect(
      shouldOfferFallbackCredit({
        planPresented: true,
        alreadyOffered: false,
        objectionDetected: false,
        planDeclined: true,
      }),
    ).toBe(true);
  });
});
