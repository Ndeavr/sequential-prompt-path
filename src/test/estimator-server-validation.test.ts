import { describe, expect, it } from "vitest";
import {
  CANONICAL_MATCHING_CATEGORY,
  validFirstName,
  validateEstimatePayload,
  validateEstimatorInputs,
  normalizeAddressServer,
} from "../../supabase/functions/create-project-unified/validation";

const baseInputs = {
  sizeSqft: 150,
  scope: "standard",
  age: "1990_2010",
  propertyKind: "maison",
  addons: ["ilot"],
};

describe("validation serveur du calculateur", () => {
  it("exige un prénom réel", () => {
    expect(validFirstName("Marie-Ève")).toBe("Marie-Ève");
    expect(validFirstName("A")).toBeNull();
    expect(validFirstName("   ")).toBeNull();
    expect(validFirstName("<script>x</script>")).toBeNull();
    expect(validFirstName(42)).toBeNull();
    expect(validFirstName("x".repeat(200))).toBeNull();
  });

  it("accepte des entrées conformes au catalogue", () => {
    const r = validateEstimatorInputs("cuisine", baseInputs);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.sizeSqft).toBe(150);
      expect(r.value.addons).toEqual(["ilot"]);
    }
  });

  it("refuse les entrées absentes ou malformées", () => {
    expect(validateEstimatorInputs("cuisine", null).ok).toBe(false);
    expect(validateEstimatorInputs("cuisine", []).ok).toBe(false);
    expect(validateEstimatorInputs("inconnue", baseInputs)).toEqual({
      ok: false,
      error: "invalid_category",
    });
  });

  it("borne la superficie par catégorie", () => {
    expect(validateEstimatorInputs("cuisine", { ...baseInputs, sizeSqft: 10 })).toEqual({
      ok: false,
      error: "invalid_size",
    });
    expect(validateEstimatorInputs("cuisine", { ...baseInputs, sizeSqft: 5000 })).toEqual({
      ok: false,
      error: "invalid_size",
    });
    expect(validateEstimatorInputs("cuisine", { ...baseInputs, sizeSqft: Number.NaN })).toEqual({
      ok: false,
      error: "invalid_size",
    });
  });

  it("refuse une option qui n'appartient pas à la catégorie", () => {
    expect(validateEstimatorInputs("cuisine", { ...baseInputs, addons: ["epoxy"] })).toEqual({
      ok: false,
      error: "invalid_addons",
    });
  });

  it("refuse une portée, un âge ou un type de propriété inconnus", () => {
    expect(validateEstimatorInputs("cuisine", { ...baseInputs, scope: "luxe" }).ok).toBe(false);
    expect(validateEstimatorInputs("cuisine", { ...baseInputs, age: "1800" }).ok).toBe(false);
    expect(validateEstimatorInputs("cuisine", { ...baseInputs, propertyKind: "chalet" }).ok).toBe(
      false,
    );
  });

  it("refuse une estimation sans version connue", () => {
    expect(validateEstimatePayload({ totalMin: 1, totalMax: 2 })).toEqual({
      ok: false,
      error: "invalid_estimator_version",
    });
    expect(
      validateEstimatePayload({ benchmark: { version: "faux" }, totalMin: 1, totalMax: 2 }).ok,
    ).toBe(false);
  });

  it("refuse une fourchette inversée ou non finie", () => {
    const bench = { version: "reno-bench-2026.09" };
    expect(validateEstimatePayload({ benchmark: bench, totalMin: 50000, totalMax: 1000 })).toEqual({
      ok: false,
      error: "invalid_estimate_range",
    });
    expect(
      validateEstimatePayload({ benchmark: bench, totalMin: Infinity, totalMax: 10 }).ok,
    ).toBe(false);
    expect(
      validateEstimatePayload({
        benchmark: bench,
        totalMin: 1000,
        totalMax: 2000,
        likely: 9000,
      }).ok,
    ).toBe(false);
  });

  it("conserve une estimation valide et bornée", () => {
    const r = validateEstimatePayload({
      benchmark: { version: "reno-bench-2026.09" },
      totalMin: 1000,
      totalMax: 2000,
      likely: 1500,
      provenance: "Inféré",
    });
    expect(r.ok).toBe(true);
    if (r.ok && r.value) {
      expect(r.value.totalMin).toBe(1000);
      expect(r.value.provenance).toBe("Inféré");
    }
  });

  it("normalise les adresses de façon stable", () => {
    expect(normalizeAddressServer("  123, Rue Principale, Laval ")).toBe(
      "123 rue principale laval",
    );
    expect(normalizeAddressServer("123 Rue Principalé")).toBe("123 rue principale");
  });

  it("utilise la catégorie canonique de jumelage", () => {
    expect(CANONICAL_MATCHING_CATEGORY).toBe("renovation-generale");
  });
});
