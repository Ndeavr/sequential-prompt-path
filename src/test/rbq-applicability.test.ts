import { describe, it, expect } from "vitest";
import { getRbqApplicability as f } from "@/lib/compliance/rbqStatus";
describe("RBQ applicabilité", () => {
  it("requise pour la toiture", () => expect(f({ specialty: "Toiture" }).status).toBe("rbq_required"));
  it("requise si activité mixte contient construction", () => expect(f({ specialty: "Entretien ménager", services: ["Rénovation"] }).status).toBe("rbq_required"));
  it("non requise pour entretien ménager seulement", () => expect(f({ specialty: "Entretien ménager" }).status).toBe("rbq_not_required"));
  it("à clarifier si vide", () => expect(f({ specialty: null }).status).toBe("rbq_needs_clarification"));
  it("à clarifier si ambigu", () => expect(f({ specialty: "Pavage et asphalte" }).status).toBe("rbq_needs_clarification"));
  it("tableau de métiers", () => expect(f({ specialty: ["Électricien"] }).status).toBe("rbq_required"));
});
