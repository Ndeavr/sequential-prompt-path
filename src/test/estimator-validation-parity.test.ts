/**
 * Garde-fou : les listes autorisées du serveur doivent rester identiques au
 * catalogue réel du calculateur, sinon des soumissions valides seraient refusées.
 */
import { describe, expect, it } from "vitest";
import {
  ALLOWED_AGE,
  ALLOWED_CATEGORIES,
  ALLOWED_PROPERTY_TYPES,
  ALLOWED_SCOPE,
  CATEGORY_ADDONS,
  CATEGORY_SIZE_BOUNDS,
  KNOWN_ESTIMATOR_VERSIONS,
  validateEstimatorInputs,
} from "../../supabase/functions/create-project-unified/validation";
import {
  AGE_LABELS,
  CATEGORIES,
  ESTIMATOR_CONFIG_VERSION,
  PROPERTY_LABELS,
  SCOPE_LABELS,
} from "@/features/renovationEstimator/catalog";

describe("Parité catalogue ↔ validation serveur", () => {
  it("accepte exactement les mêmes âges de bâtiment", () => {
    expect([...ALLOWED_AGE].sort()).toEqual(Object.keys(AGE_LABELS).sort());
  });

  it("accepte les mêmes catégories, finitions et types de propriété", () => {
    expect([...ALLOWED_CATEGORIES].sort()).toEqual(Object.keys(CATEGORIES).sort());
    expect([...ALLOWED_SCOPE].sort()).toEqual(Object.keys(SCOPE_LABELS).sort());
    expect([...ALLOWED_PROPERTY_TYPES].sort()).toEqual(Object.keys(PROPERTY_LABELS).sort());
  });

  it("connaît la version active du catalogue", () => {
    expect(KNOWN_ESTIMATOR_VERSIONS.has(ESTIMATOR_CONFIG_VERSION)).toBe(true);
  });

  it("reprend les bornes de superficie et les options de chaque catégorie", () => {
    for (const def of Object.values(CATEGORIES)) {
      expect(CATEGORY_SIZE_BOUNDS[def.id]).toEqual([def.sizeMin, def.sizeMax]);
      expect([...CATEGORY_ADDONS[def.id]].sort()).toEqual(def.addons.map((a) => a.id).sort());
    }
  });

  it("valide une soumission UI réaliste pour chaque catégorie et chaque âge", () => {
    for (const def of Object.values(CATEGORIES)) {
      for (const age of Object.keys(AGE_LABELS)) {
        const res = validateEstimatorInputs(def.id, {
          sizeSqft: def.sizeDefault,
          scope: "standard",
          age,
          propertyKind: "maison",
          addons: def.addons.slice(0, 2).map((a) => a.id),
        });
        expect(res.ok, `${def.id}/${age}`).toBe(true);
      }
    }
  });

  it("refuse un âge inexistant", () => {
    const res = validateEstimatorInputs("cuisine", {
      sizeSqft: 150,
      scope: "standard",
      age: "avant_1960",
      propertyKind: "maison",
      addons: [],
    });
    expect(res).toEqual({ ok: false, error: "invalid_age" });
  });
});
