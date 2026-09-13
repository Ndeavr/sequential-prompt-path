/**
 * Permissions de contact — échec fermé.
 * Aucun envoi commercial sans preuve LCAP valide par destination.
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
    const p = computeContactPermissions({ eligibility: elig(), has_phone: true, has_email: true });
    expect(p).toMatchObject({ can_call: true, can_sms: true, can_email: true, research_only: false });
  });

  it("bloque tout envoi sans dossier de conformité relié", () => {
    const p = computeContactPermissions({ eligibility: null, has_phone: true, has_email: true });
    expect(p.can_sms).toBe(false);
    expect(p.can_email).toBe(false);
    expect(p.research_only).toBe(true);
    expect(p.can_call).toBe(true); // appel manuel non bloqué par la LCAP
  });

  it("bloque quand la révision de conformité est requise", () => {
    const p = computeContactPermissions({
      eligibility: elig({ compliance_review_required: true, compliance_review_reason: "numéro non vérifié" }),
      has_phone: true,
      has_email: true,
    });
    expect(p.can_sms).toBe(false);
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
