import { describe, it, expect } from "vitest";
import { queueRowPolicy, emptyCtaAction, recoveryStageLabel } from "@/features/affiliate/warRoom/queuePolicy";

const base = { queue: "manual_contact", contact_locked: false, opted_out: false, phone_e164: "+15145550000", email: "a@ex.test", blocked_reason: null };

describe("queueRowPolicy", () => {
  it("autorise par canal quand le serveur fournit la coordonnée non verrouillée", () => {
    const p = queueRowPolicy({ ...base, email: null });
    expect([p.can_call, p.can_sms, p.can_email]).toEqual([true, true, false]);
  });
  it("reprise sans preuve : verrou serveur conservé avec motif", () => {
    const p = queueRowPolicy({ ...base, queue: "onboarding_recovery", contact_locked: true, phone_e164: null, email: null, blocked_reason: "Vérification de conformité requise avant tout contact" });
    expect(p.can_call || p.can_sms || p.can_email).toBe(false);
    expect(p.blocked_reason).toBe("Vérification de conformité requise avant tout contact");
  });
  it("reprise autorisée individuellement par le serveur n'est plus bloquée par le type de file", () => {
    expect(queueRowPolicy({ ...base, queue: "onboarding_recovery" }).can_call).toBe(true);
  });
  it("opposition bloque tout", () => {
    const p = queueRowPolicy({ ...base, opted_out: true });
    expect(p.can_email || p.can_call).toBe(false);
  });
  it("verrou inconnu (null) = refusé", () => {
    expect(queueRowPolicy({ ...base, contact_locked: null }).can_call).toBe(false);
  });
});

describe("emptyCtaAction", () => {
  it("aucun prospect → ajouter", () => expect(emptyCtaAction(false, "no_eligible_prospect", null)).toBe("add_prospect"));
  it("erreur réseau → réessayer", () => expect(emptyCtaAction(false, null, "Failed to fetch")).toBe("retry"));
  it("checkout_opened n'est pas un abandon prouvé", () => expect(recoveryStageLabel("checkout_opened")).toMatch(/non confirmé/));
});
