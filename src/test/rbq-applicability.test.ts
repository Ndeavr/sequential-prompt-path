import { describe, it, expect } from "vitest";
import { getRbqApplicability as f } from "@/lib/compliance/rbqStatus";
describe("RBQ applicabilité", () => {
  it.each(["Entretien de gazon", "Tonte", "Tonte de pelouse", "Paysagement", "Entretien pelouse", "Entretien de gazon et tonte"])("non assujetti pour %s seul", specialty => {
    expect(f({ specialty }).status).toBe("rbq_not_required");
  });
  it.each(["Gaz naturel", "Appareils à gaz", "Plomberie gaz", "Conduite de gaz", "Propane", "Chauffage gazeux", "Entretien de gazon et plomberie", "Paysagement et excavation"])("réglementé pour %s", specialty => {
    expect(f({ specialty }).status).toBe("rbq_required");
  });
  it("ne transmet pas l'exemption à une activité inconnue", () => expect(f({ specialty: "Paysagement et autres travaux" }).status).toBe("rbq_needs_clarification"));
  it("requise pour la toiture", () => expect(f({ specialty: "Toiture" }).status).toBe("rbq_required"));
  it("requise si activité mixte contient construction", () => expect(f({ specialty: "Entretien ménager", services: ["Rénovation"] }).status).toBe("rbq_required"));
  it("non requise pour entretien ménager seulement", () => expect(f({ specialty: "Entretien ménager" }).status).toBe("rbq_not_required"));
  it("à clarifier si vide", () => expect(f({ specialty: null }).status).toBe("rbq_needs_clarification"));
  it("à clarifier si ambigu", () => expect(f({ specialty: "Pavage et asphalte" }).status).toBe("rbq_needs_clarification"));
  it("tableau de métiers", () => expect(f({ specialty: ["Électricien"] }).status).toBe("rbq_required"));
  it.each(["Lawn care", "lawn-care", "Lawn maintenance", "Lawn mowing", "Grass cutting", "Tonte de la pelouse"])("entretien FR/EN sans licence inférée pour %s", specialty => {
    expect(f({ specialty }).status).toBe("rbq_not_required");
  });
  it.each(["Gas heating", "Gas connection", "Lawn care and gas installation", "Raccordement gaz"])("garde gaz conservée pour %s", specialty => {
    expect(f({ specialty }).status).toBe("rbq_required");
  });
  it("scope inconnu ne prend jamais une exemption par substring", () => {
    expect(f({ specialty: "Entretien ménager et autres travaux" }).status).toBe("rbq_needs_clarification");
    expect(f({ specialty: "Lawn care", services: ["other work"] }).status).toBe("rbq_needs_clarification");
  });
});
