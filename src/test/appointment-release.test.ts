import { describe, it, expect } from "vitest";
import { mayReleaseAppointment, needsNewEntryActivation, bookingStateAfterRequest, shouldSendDetailsEmail, detailsEmailKey, moreAppointmentsLink, includeMoreAppointmentsCtaInEmail, type ContractorForRelease } from "../../supabase/functions/_shared/appointmentRelease";

const c: ContractorForRelease = { identity_verified: true, contact_reliable: true, trade_compatible: true, territory_compatible: true, clarifications_answered: true, mandatory_qualifications_valid: true, profile_completeness_pct: 40 };
const live = { livemode: true, signed_webhook: true, paid: true, amount_subtotal_cents: 35000, currency: "CAD", refunded: false, disputed: false };

describe("Libération du RDV entrepreneur", () => {
  it("profil minimal utile + paiement LIVE = RDV possible", () => expect(mayReleaseAppointment(c, live)).toBe(true));
  it("profil 100 % sans paiement = refus", () => expect(mayReleaseAppointment({ ...c, profile_completeness_pct: 100 }, null)).toBe(false));
  it("qualification invalide exclue même payée", () => expect(mayReleaseAppointment({ ...c, mandatory_qualifications_valid: false }, live)).toBe(false));
  it("paiement test, remboursé ou contesté refusé", () => {
    expect(mayReleaseAppointment(c, { ...live, livemode: false })).toBe(false);
    expect(mayReleaseAppointment(c, { ...live, refunded: true })).toBe(false);
    expect(mayReleaseAppointment(c, { ...live, disputed: true })).toBe(false);
  });
  it("aucune deuxième activation 350 $", () => expect(needsNewEntryActivation(1)).toBe(false));
  it("sans agenda : en attente, jamais fausse confirmation", () => {
    expect(bookingStateAfterRequest(false, null, false)).toBe("requested_pending");
    expect(bookingStateAfterRequest(true, false, true)).toBe("slot_taken");
  });
  it("courriel de détails seulement si confirmé, sans doublon", () => {
    expect(shouldSendDetailsEmail("requested_pending", new Set(), "b1")).toBe(false);
    expect(shouldSendDetailsEmail("confirmed", new Set(), "b1")).toBe(true);
    expect(shouldSendDetailsEmail("confirmed", new Set([detailsEmailKey("b1")]), "b1")).toBe(false);
  });
  it("CTA vers parcours objectifs existant, pas Checkout", () => {
    const l = moreAppointmentsLink("c1");
    expect(l.startsWith("/entrepreneur/devis-personnalise")).toBe(true);
    expect(l).not.toMatch(/checkout|stripe/i);
    expect(includeMoreAppointmentsCtaInEmail(false)).toBe(false);
  });
});
