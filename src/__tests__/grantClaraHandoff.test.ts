import { describe, expect, it } from "vitest";
import { buildGrantClaraHandoff } from "@/lib/grantClaraHandoff";
import type { GrantInputs } from "@/lib/grantCalculator2026";

const example: GrantInputs = {
  selected: ["toit", "fenetres"], building: "maison", regime: "nouveau",
  roofType: "grenier", roofArea: 1200, roofRAdded: 20, roofRFinal: 60,
  wallsArea: 0, wallsRAdded: 0,
  foundationType: "murs-sous-sol", foundationArea: 0, foundationRAdded: 0,
  windowCount: 10, windowsMostEfficient: true,
};

describe("transfert calculateur UNPRO → Clara", () => {
  it("reprend les travaux, mesures et résultats sans prétendre à une confirmation", () => {
    const text = buildGrantClaraHandoff(example, "project");
    expect(text).toContain("Entretoit");
    expect(text).toContain("Fenêtres");
    expect(text).toContain("1200 pi²");
    expect(text).toContain("R ajouté : 20");
    expect(text).toContain("10 ouvertures");
    expect(text).toContain("3 000");
    expect(text).toContain("déclarées, non vérifiées");
    expect(text).toContain("ne les redemander");
    expect(text).toContain("une à la fois");
    expect(text).not.toContain("confirmé par le gouvernement");
  });

  it("demande à Clara un coût distinct des aides", () => {
    const text = buildGrantClaraHandoff(example, "cost");
    expect(text).toContain("COÛT probable");
    expect(text).toContain("avant les aides");
    expect(text).toContain("3 000");
  });

  it("ne transmet pas les renseignements d'une mesure non sélectionnée", () => {
    const text = buildGrantClaraHandoff({
      ...example, selected: ["fenetres"],
      foundationArea: 800, wallsArea: 400, roofArea: 3000,
    }, "project");
    expect(text).not.toContain("Fondations :");
    expect(text).not.toContain("Murs extérieurs :");
    expect(text).not.toContain("Toiture :");
    expect(text).toContain("10 ouvertures");
  });

  it("ne fabrique pas de montant si les travaux sont inconnus", () => {
    const text = buildGrantClaraHandoff({ ...example, selected: [] }, "project");
    expect(text).toContain("aucun type de travaux");
    expect(text).not.toContain("Résultats INDICATIFS");
  });
});
