import { describe, it, expect } from "vitest";
import { decideRelease, firstOfferedGrantKey, ACTIVATION_OFFER_COPY_FR, type ReleaseInput } from "../../supabase/functions/_shared/appointmentRelease";

const inv = { id: "inv1", demand_id: "d1", contractor_id: "c1", source: "server" as const };
const base: ReleaseInput = {
  contractorId: "c1", demandId: "d1", identityReliable: true, scopeCompatible: true,
  mandatoryQualificationsVerified: true, liveActivationPaid: true, invitation: inv, existingGrants: [],
};

describe("premier RDV offert sur invitation", () => {
  it("invité admissible payé reçoit 1 droit offert, 0 $ et sans débit de pack", () => {
    const d = decideRelease(base);
    expect(d.release && d.grant?.kind).toBe("first_offered");
    expect(d.release && d.grantIsNew).toBe(true);
    expect(d.release && d.appointmentFeeCents).toBe(0);
    expect(d.release && d.grant?.consumes_paid_pack).toBe(false);
  });
  it("non invité : aucun cadeau automatique", () => {
    const d = decideRelease({ ...base, invitation: null });
    expect(d.release && d.grant).toBeNull();
  });
  it("invitation d'une autre entreprise ou demande, ou non serveur : aucun droit", () => {
    for (const i of [{ ...inv, contractor_id: "c2" }, { ...inv, demand_id: "d2" }, { ...inv, source: "url" as any }]) {
      const d = decideRelease({ ...base, invitation: i });
      expect(d.release && d.grant).toBeNull();
    }
  });
  it("replay/double clic : pas de second droit", () => {
    const d = decideRelease({ ...base, existingGrants: [{ invitation_id: "inv1", kind: "first_offered" }] });
    expect(d.release && d.grantIsNew).toBe(false);
    expect(firstOfferedGrantKey("inv1")).toBe(firstOfferedGrantKey("inv1"));
  });
  it("activation 350 $ toujours exigée même invité", () => {
    expect(decideRelease({ ...base, liveActivationPaid: false })).toEqual({ release: false, reason: "activation_unpaid" });
  });
  it("qualification invalide exclue même payé et invité", () => {
    expect(decideRelease({ ...base, mandatoryQualificationsVerified: false }).release).toBe(false);
  });
  it("texte d'offre exact avant paiement", () => {
    expect(ACTIVATION_OFFER_COPY_FR).toContain("350 $ + taxes");
    expect(ACTIVATION_OFFER_COPY_FR).toContain("premier rendez-vous qualifié est offert");
  });
});
