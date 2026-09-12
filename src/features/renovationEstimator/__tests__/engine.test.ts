import { describe, it, expect } from "vitest";
import { computeRenovationEstimate, cityFactorFor, formatCad } from "../engine";
import type { EstimatorInput } from "../engine";
import { CATEGORIES, CATEGORY_ORDER } from "../catalog";

const base: EstimatorInput = {
  category: "cuisine",
  sizeSqft: 150,
  scope: "standard",
  addons: [],
  propertyKind: "maison",
  age: "1980_2005",
  citySlug: "laval",
};

describe("renovation estimator engine", () => {
  it("produit une fourchette finie et positive pour chaque catégorie", () => {
    for (const c of CATEGORY_ORDER) {
      const r = computeRenovationEstimate({ ...base, category: c, sizeSqft: CATEGORIES[c].sizeDefault });
      expect(Number.isFinite(r.totalMin)).toBe(true);
      expect(Number.isFinite(r.totalMax)).toBe(true);
      expect(r.totalMin).toBeGreaterThan(0);
      expect(r.totalMax).toBeGreaterThanOrEqual(r.totalMin);
    }
  });

  it("est déterministe", () => {
    expect(computeRenovationEstimate(base)).toEqual(computeRenovationEstimate(base));
  });

  it("croît de façon monotone avec la superficie", () => {
    const small = computeRenovationEstimate({ ...base, sizeSqft: 100 });
    const large = computeRenovationEstimate({ ...base, sizeSqft: 300 });
    expect(large.totalMin).toBeGreaterThan(small.totalMin);
    expect(large.totalMax).toBeGreaterThan(small.totalMax);
  });

  it("croît avec le niveau de finition", () => {
    const a = computeRenovationEstimate({ ...base, scope: "essentiel" });
    const b = computeRenovationEstimate({ ...base, scope: "standard" });
    const c = computeRenovationEstimate({ ...base, scope: "haut_de_gamme" });
    expect(b.totalMin).toBeGreaterThan(a.totalMin);
    expect(c.totalMin).toBeGreaterThan(b.totalMin);
  });

  it("ajoute le coût des options sélectionnées", () => {
    const none = computeRenovationEstimate(base);
    const withAddons = computeRenovationEstimate({ ...base, addons: ["ilot", "comptoir_quartz"] });
    expect(withAddons.optionsMin).toBeGreaterThan(none.optionsMin);
    expect(withAddons.totalMax).toBeGreaterThan(none.totalMax);
  });

  it("borne les superficies hors limites sans produire NaN", () => {
    const tooSmall = computeRenovationEstimate({ ...base, sizeSqft: -500 });
    const tooLarge = computeRenovationEstimate({ ...base, sizeSqft: 999999 });
    const nan = computeRenovationEstimate({ ...base, sizeSqft: Number.NaN });
    for (const r of [tooSmall, tooLarge, nan]) {
      expect(Number.isFinite(r.totalMax)).toBe(true);
      expect(r.totalMin).toBeGreaterThan(0);
    }
  });

  it("n'affiche pas de point milieu quand la confiance est faible", () => {
    const r = computeRenovationEstimate({ ...base, category: "renovation_complete", sizeSqft: 1400 });
    expect(r.confidence).toBe("faible");
    expect(r.likely).toBeNull();
  });

  it("utilise une composante mesurée et la marque Déclaré", () => {
    const r = computeRenovationEstimate(
      { ...base, addons: ["deplacement_plomberie"] },
      [{ component: "Plomberie", avg_cost_per_unit: 22, unit_type: "sqft", sample_count: 7, last_updated_from_actuals: null }],
    );
    const line = r.lines.find((l) => l.id === "deplacement_plomberie");
    expect(line?.provenance).toBe("Déclaré");
    expect(r.benchmark.verifiedComponents).toBe(1);
  });

  it("ignore un échantillon insuffisant et reste Inféré", () => {
    const r = computeRenovationEstimate(
      { ...base, addons: ["deplacement_plomberie"] },
      [{ component: "Plomberie", avg_cost_per_unit: 22, unit_type: "sqft", sample_count: 2, last_updated_from_actuals: null }],
    );
    expect(r.lines.find((l) => l.id === "deplacement_plomberie")?.provenance).toBe("Inféré");
    expect(r.provenance).toBe("Inféré");
  });

  it("calcule les taxes séparément", () => {
    const r = computeRenovationEstimate(base);
    expect(r.taxesMin).toBe(Math.round(r.subtotalMin * 0.14975));
    expect(r.totalMin).toBe(r.subtotalMin + r.taxesMin);
  });

  it("applique un facteur local connu et un défaut sûr", () => {
    expect(cityFactorFor("montreal")).toBe(1);
    expect(cityFactorFor("ville-inconnue")).toBeGreaterThan(0);
    expect(cityFactorFor(null)).toBeGreaterThan(0);
  });

  it("formate en dollars canadiens", () => {
    expect(formatCad(12345)).toContain("12");
    expect(formatCad(Number.NaN)).toBeTruthy();
  });
});
