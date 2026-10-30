import { describe, it, expect } from "vitest";
import { activationCommissionCents, recurringCommissionCents, projection24Cents, resolveRate, offerTypeOf, proposalStatusOf, PROPOSAL_STATUS_LABELS, formatCad, activationLink } from "../offers";

describe("offres affilié", () => {
  it("20 % sur 350 $ = 70 $ unique", () => expect(activationCommissionCents(0.2)).toBe(7000));
  it("taux inconnu = À déterminer, pas 0", () => {
    expect(activationCommissionCents(resolveRate(null))).toBeNull();
    expect(formatCad(null)).toBe("À déterminer");
  });
  it("taux en pourcentage accepté", () => expect(resolveRate({ commission_pct: 20 })).toBe(0.2));
  it("zéro confirmé reste distinct de null", () => {
    expect(resolveRate({ commission_rate: 0 })).toBe(0);
    expect(recurringCommissionCents(0, 0.2)).toBe(0);
    expect(recurringCommissionCents(undefined, 0.2)).toBeNull();
  });
  it("pas de récurrence ni projection sans prix mensuel serveur", () => {
    expect(recurringCommissionCents(null, 0.2)).toBeNull();
    expect(projection24Cents(recurringCommissionCents(null, 0.2))).toBeNull();
  });
  it("récurrent 24 mois seulement si connu", () => expect(projection24Cents(recurringCommissionCents(29900, 0.2))).toBe(5980 * 24));
  it("offre absente = À définir, aucun statut", () => {
    expect(offerTypeOf(null)).toBe("a_definir");
    expect(proposalStatusOf(null)).toBeNull();
  });
  it("paid_at CRM signale un paiement mais ne prouve pas Stripe LIVE + webhook + droit", () => {
    expect(proposalStatusOf({ used_at: "x" })).toBe("acceptee");
    expect(proposalStatusOf({ paid_at: "x" })).toBe("paiement_a_verifier");
    expect(PROPOSAL_STATUS_LABELS.paiement_a_verifier).toContain("à vérifier");
    expect(proposalStatusOf({})).toBe("brouillon");
  });
  it("lien conserve attribution et prospect", () => {
    const u = new URL(activationLink("https://unpro.ca", "LORR-1", "p1"));
    expect(u.searchParams.get("ref")).toBe("LORR-1");
    expect(u.searchParams.get("prospect")).toBe("p1");
  });
});
