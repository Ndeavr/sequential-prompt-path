import { describe, it, expect } from "vitest";
import { getRbqDashboardState as s } from "@/lib/compliance/rbqDeclaration";

const roof = { specialty: "Toiture" };
const clean = { specialty: "Entretien ménager" };

describe("RBQ — 5 options et état dashboard", () => {
  it("vérifiée : pas de demande", () => {
    const r = s({ ...roof, rbq_number: "1234-5678-90", rbq_compliance_status: "verified" });
    expect(r.kind).toBe("verified"); expect(r.isNextAction).toBe(false); expect(r.regulatedEligible).toBe(true);
  });
  it("has_license sans vérif = PENDING, non admissible", () => {
    const r = s({ ...roof, rbq_number: "1234-5678-90", rbq_compliance_status: "in_progress", rbq_declaration: "has_license" });
    expect(r.marker).toBe("PENDING"); expect(r.regulatedEligible).toBe(false);
  });
  it("exemption déclarée sur Toiture reste action + non admissible", () => {
    const r = s({ ...roof, rbq_declaration: "not_required" });
    expect(r.title).toBe("Exemption déclarée — vérification de l'activité en cours");
    expect(r.marker).toBe("DECLARED"); expect(r.isNextAction).toBe(true); expect(r.regulatedEligible).toBe(false);
  });
  it("exemption déclarée sur service non réglementé n'est pas bloquante", () => {
    expect(s({ ...clean, rbq_declaration: "not_required" }).isNextAction).toBe(false);
  });
  it("en cours d'obtention", () => expect(s({ ...roof, rbq_declaration: "in_progress" }).title).toBe("Licence en cours d'obtention"));
  it("incertain", () => expect(s({ ...clean, rbq_declaration: "unsure" }).title).toBe("Vérifier si une licence est nécessaire"));
  it("autre = examen", () => expect(s({ ...roof, rbq_declaration: "other" }).kind).toBe("under_review"));
  it("expirée/suspendue bloque même avec exemption déclarée", () => {
    const r = s({ ...roof, rbq_number: "1", rbq_compliance_status: "expired", rbq_declaration: "not_required" });
    expect(r.kind).toBe("blocked"); expect(r.regulatedEligible).toBe(false);
  });
  it("vérifiée mais date passée = bloquée", () => {
    expect(s({ ...roof, rbq_number: "1", rbq_compliance_status: "verified", rbq_expiry_date: "2020-01-01" }).kind).toBe("blocked");
  });
  it("numéro stocké sans déclaration : déclaré, jamais exempté ni vérifié", () => {
    for (const specialty of ["Toiture", "Cuisine", "Entretien ménager"]) {
      const r = s({ specialty, rbq_number: "1234-5678-90", rbq_compliance_status: "not_provided" });
      expect(r.marker).toBe("DECLARED"); expect(r.kind).toBe("under_review");
      expect(r.isNextAction).toBe(true); expect(r.regulatedEligible).toBe(false);
    }
  });
  it("Toiture sans déclaration = demande RBQ", () => expect(s(roof).kind).toBe("needs_rbq"));
  it("activité mixte = demande RBQ", () => expect(s({ specialty: "Entretien ménager", services: ["Rénovation"] }).kind).toBe("needs_rbq"));
  it("service non réglementé sans déclaration n'exige rien", () => expect(s(clean).isNextAction).toBe(false));
});

describe("RBQ — entreprise titulaire (art. 46 B-1.1)", () => {
  it("employé = autorisation en attente, jamais admissible", () => {
    const r = s({ ...roof, rbq_declaration: "employer_licensed", rbq_declaration_details: { employer_relationship: "employee", employer_legal_name: "Toitures ABC inc." } });
    expect(r.kind).toBe("pending_employer_authorization"); expect(r.detail).toContain("Toitures ABC inc."); expect(r.regulatedEligible).toBe(false);
  });
  it("représentant = en attente", () => {
    expect(s({ ...roof, rbq_declaration: "employer_licensed", rbq_declaration_details: { employer_relationship: "representative" } }).kind).toBe("pending_employer_authorization");
  });
  it("indépendant = licence propre requise, bloqué", () => {
    const r = s({ ...roof, rbq_declaration: "employer_licensed", rbq_declaration_details: { employer_relationship: "independent" } });
    expect(r.kind).toBe("independent_needs_own_licence"); expect(r.regulatedEligible).toBe(false); expect(r.isNextAction).toBe(true);
  });
});
