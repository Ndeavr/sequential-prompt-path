import { describe, expect, it } from "vitest";
import { calculateGrants, type GrantInputs } from "@/lib/grantCalculator2026";

function input(patch: Partial<GrantInputs> = {}): GrantInputs {
  return {
    selected: ["fenetres"], building: "maison", regime: "nouveau",
    roofType: "grenier", roofArea: 0, roofRAdded: 0, roofRFinal: 0,
    wallsArea: 0, wallsRAdded: 0,
    foundationType: "murs-sous-sol", foundationArea: 0, foundationRAdded: 0,
    windowCount: 0, windowsMostEfficient: false,
    ...patch,
  };
}

describe("calculateur Rénoclimat / LogisVert 2026", () => {
  it("calcule 300 $ par ouverture brute admissible et applique le plafond maison", () => {
    const r = calculateGrants(input({ windowCount: 10, windowsMostEfficient: true }));
    expect(r.results[0].amount).toBe(3000);
    expect(calculateGrants(input({ windowCount: 25, windowsMostEfficient: true })).results[0].amount).toBe(4500);
  });

  it("applique le plafond 6000 $ aux fenêtres d'un multilogement", () => {
    const r = calculateGrants(input({ building: "multilogement", windowCount: 25, windowsMostEfficient: true }));
    expect(r.results[0].amount).toBe(6000);
  });

  it("n'affiche pas de montant sans certification prévue des fenêtres", () => {
    const r = calculateGrants(input({ windowCount: 10, windowsMostEfficient: false }));
    expect(r.results[0].amount).toBeNull();
    expect(r.renoclimatSubtotal).toBeNull();
  });

  it("valide 300 pi², R20 ajouté et R60 final avant le calcul d'entretoit", () => {
    const a = calculateGrants(input({ selected: ["toit"], roofArea: 1000, roofRAdded: 20, roofRFinal: 60 }));
    expect(a.results[0].amount).toBe(1750);
    const b = calculateGrants(input({ selected: ["toit"], roofArea: 1000, roofRAdded: 10, roofRFinal: 60 }));
    expect(b.results[0].amount).toBeNull();
    const c = calculateGrants(input({ selected: ["toit"], roofArea: 10000, roofRAdded: 20, roofRFinal: 60 }));
    expect(c.results[0].amount).toBe(2000);
  });

  it("utilise R40 pour un toit plat et R9 pour les murs extérieurs", () => {
    const a = calculateGrants(input({ selected: ["toit"], roofType: "plat", roofArea: 500, roofRAdded: 20, roofRFinal: 40 }));
    expect(a.results[0].amount).toBe(875);
    const b = calculateGrants(input({ selected: ["murs"], wallsArea: 500, wallsRAdded: 9 }));
    expect(b.results[0].amount).toBe(1750);
  });

  it("utilise les taux selon la fondation et limite aux plafonds du type d'habitation", () => {
    const r = calculateGrants(input({ selected: ["fondations"], foundationArea: 1000, foundationRAdded: 15 }));
    expect(r.results[0].amount).toBe(2500);
    const s = calculateGrants(input({ selected: ["fondations"], foundationType: "dalle-sous-sol", foundationArea: 300, foundationRAdded: 3 }));
    expect(s.results[0].amount).toBe(150);
  });

  it("n'ajoute jamais LogisVert à Rénoclimat par défaut", () => {
    const r = calculateGrants(input({ selected: ["toit", "calfeutrage"], roofArea: 1000, roofRAdded: 20, roofRFinal: 60 }));
    expect(r.renoclimatSubtotal).toBe(1750);
    expect(r.logisvertRoofCaulking).toBe(1500);
  });

  it("ne promet ni subvention pour le calfeutrage seul ni montant de thermopompe", () => {
    const r = calculateGrants(input({ selected: ["calfeutrage", "thermopompe"] }));
    expect(r.results.every(x => x.amount === null)).toBe(true);
    expect(r.logisvertRoofCaulking).toBeNull();
    expect(r.renoclimatSubtotal).toBeNull();
  });

  it("ne réutilise jamais le nouveau barème pour un dossier historique ou incertain", () => {
    for (const regime of ["ancien", "incertain"] as const) {
      const r = calculateGrants(input({ windowCount: 10, windowsMostEfficient: true, regime }));
      expect(r.results[0].amount).toBeNull();
      expect(r.renoclimatSubtotal).toBeNull();
    }
  });
});
