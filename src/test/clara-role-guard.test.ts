import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { canRunClaraAction, filterSuggestionsForRole } from "@/services/clara/claraRoleGuard";

describe("Clara — garde de rôle", () => {
  it("refuse toute action propriétaire en mode entrepreneur, affilié ou inconnu", () => {
    for (const role of ["contractor", "affiliate", "unknown"] as const) {
      expect(canRunClaraAction(role, "open_dossier_maison")).toBe(false);
      expect(canRunClaraAction(role, "resume_home_project")).toBe(false);
      expect(canRunClaraAction(role, "edit_property_address")).toBe(false);
    }
    expect(canRunClaraAction("homeowner", "open_dossier_maison")).toBe(true);
    expect(canRunClaraAction("homeowner", "contractor_activation_350")).toBe(false);
  });

  it("retire les suggestions maison hors du parcours propriétaire", () => {
    const options = ["Revenir à mon projet maison", "Choisir l'adresse", "Ouvrir mon dossier maison", "Peinture", "Laval"];
    expect(filterSuggestionsForRole("contractor", options)).toEqual(["Choisir l'adresse", "Peinture", "Laval"].filter((o) => o !== "Choisir l'adresse"));
    expect(filterSuggestionsForRole("homeowner", options)).toEqual(options);
  });

  it("n'affiche plus de texte d'auto-inspection au public", () => {
    const sheet = readFileSync("src/components/dossier-maison/DossierMaisonSheet.tsx", "utf8");
    const box = readFileSync("src/components/home-light/ClaraConversationBox.tsx", "utf8");
    expect(sheet).not.toMatch(/réellement enregistré|Rien n'est ajouté sans/);
    expect(box).not.toMatch(/Revenir à mon projet maison|Continuons votre projet maison/);
    expect(box).toMatch(/canRunClaraAction\(audience, "open_dossier_maison"\)/);
  });
});
