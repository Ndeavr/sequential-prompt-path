/**
 * Permissions de contact — échec fermé.
 * Aucun envoi commercial sans preuve LCAP valide par destination,
 * et aucun canal (appel compris) en cas de retrait, suppression ou
 * révision de conformité ouverte.
 */
import { describe, it, expect } from "vitest";
import {
  computeContactPermissions,
  type SendEligibilityRow,
} from "../../supabase/functions/_shared/contactPermissions";

const elig = (o: Partial<SendEligibilityRow> = {}): SendEligibilityRow => ({
  contractor_lead_id: "lead-1",
  compliance_review_required: false,
  compliance_review_reason: null,
  valid_phone_evidence_count: 1,
  valid_email_evidence_count: 1,
  phone_suppressed: false,
  email_suppressed: false,
  ...o,
});

describe("computeContactPermissions", () => {
  it("autorise les deux canaux avec une preuve valide", () => {
    const p = computeContactPermissions({
      eligibility: elig(),
      has_phone: true,
      has_email: true,
      phone_validation_status: "valid_mobile",
    });
    expect(p).toMatchObject({ can_call: true, can_sms: true, can_email: true, research_only: false });
    expect(p.phone_unverified).toBe(false);
  });

  it("autorise l'appel avec l'autre statut positif observé en base", () => {
    const p = computeContactPermissions({
      eligibility: elig(),
      has_phone: true,
      has_email: false,
      phone_validation_status: "valid_sms_capable_voip",
    });
    expect(p.can_call).toBe(true);
    expect(p.phone_unverified).toBe(false);
  });

  it("bloque tout envoi électronique sans dossier de conformité relié", () => {
    const p = computeContactPermissions({ eligibility: null, has_phone: true, has_email: true });
    expect(p.can_sms).toBe(false);
    expect(p.can_email).toBe(false);
    // Échec fermé : sans validation positive du numéro, aucun appel non plus.
    expect(p.can_call).toBe(false);
    expect(p.research_only).toBe(true);
    expect(p.phone_unverified).toBe(true);
  });

  // Chaque statut non positif bloque l'appel ET expose la raison exacte.
  it.each([
    ["unverified", "non validé positivement"],
    ["pending_validation", "en attente"],
    ["lookup_failed", "a échoué"],
    ["outside_quebec", "hors Québec"],
    ["", "non validé positivement"],
  ])("bloque l'appel pour le statut non positif « %s »", (status, expected) => {
    const p = computeContactPermissions({
      eligibility: elig(),
      has_phone: true,
      has_email: false,
      phone_validation_status: status,
    });
    expect(p.can_call).toBe(false);
    expect(p.reasons.call).toContain(expected);
  });

  it("bloque l'appel quand le statut est null", () => {
    const p = computeContactPermissions({
      eligibility: elig(),
      has_phone: true,
      has_email: false,
      phone_validation_status: null,
    });
    expect(p.can_call).toBe(false);
    // SMS conserve sa propre porte LCAP : preuve valide présente ici.
    expect(p.can_sms).toBe(true);
    expect(p.research_only).toBe(false);
  });

  it("research_only seulement quand les trois canaux sont refusés", () => {
    const p = computeContactPermissions({
      eligibility: null,
      has_phone: true,
      has_email: true,
      phone_validation_status: null,
    });
    expect([p.can_call, p.can_sms, p.can_email]).toEqual([false, false, false]);
    expect(p.research_only).toBe(true);
  });


  it("bloque tous les canaux, appel compris, quand une révision de conformité est requise", () => {
    const p = computeContactPermissions({
      eligibility: elig({ compliance_review_required: true, compliance_review_reason: "numéro non vérifié" }),
      has_phone: true,
      has_email: true,
    });
    expect(p.can_sms).toBe(false);
    expect(p.can_call).toBe(false);
    expect(p.research_only).toBe(true);
    expect(p.reasons.sms).toContain("numéro non vérifié");
  });

  it("bloque sans preuve valide pour la destination", () => {
    const p = computeContactPermissions({
      eligibility: elig({ valid_phone_evidence_count: 0 }),
      has_phone: true,
      has_email: true,
    });
    expect(p.can_sms).toBe(false);
    expect(p.can_email).toBe(true);
    expect(p.research_only).toBe(false);
  });

  it("respecte l'index de suppression", () => {
    const p = computeContactPermissions({
      eligibility: elig({ email_suppressed: true }),
      has_phone: true,
      has_email: true,
    });
    expect(p.can_email).toBe(false);
  });

  it("bloque l'appel quand le numéro est supprimé", () => {
    const p = computeContactPermissions({
      eligibility: elig({ phone_suppressed: true }),
      has_phone: true,
      has_email: false,
    });
    expect(p.can_call).toBe(false);
    expect(p.can_sms).toBe(false);
  });

  it("bloque l'appel quand le numéro est déclaré invalide", () => {
    const p = computeContactPermissions({
      eligibility: elig(),
      has_phone: true,
      has_email: false,
      phone_validation_status: "invalid",
    });
    expect(p.can_call).toBe(false);
    expect(p.can_sms).toBe(false);
    expect(p.research_only).toBe(true);
  });

  it("bloque tous les canaux, appel compris, en cas de retrait", () => {
    const p = computeContactPermissions({
      eligibility: elig(),
      has_phone: true,
      has_email: true,
      do_not_contact: true,
    });
    expect(p).toMatchObject({ can_call: false, can_sms: false, can_email: false, research_only: true });
  });

  it("bloque le canal dont la coordonnée est absente", () => {
    const p = computeContactPermissions({ eligibility: elig(), has_phone: false, has_email: true });
    expect(p.can_call).toBe(false);
    expect(p.can_sms).toBe(false);
    expect(p.can_email).toBe(true);
  });
});
