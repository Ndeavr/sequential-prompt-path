/**
 * Vérité des libellés de provenance et clés de ville.
 * « Vérifié » exige une vraie mise à jour issue de projets mesurés.
 */
import { describe, it, expect } from "vitest";
import { isMeasuredBenchmark, computeEstimate, type BenchmarkRow } from "../engine";
import { CITY_FACTORS } from "../catalog";

const base = (over: Partial<BenchmarkRow> = {}): BenchmarkRow => ({
  component: "cuisine_armoires",
  avg_cost_per_unit: 120,
  unit_type: "unit",
  sample_count: 12,
  last_updated_from_actuals: new Date().toISOString(),
  ...over,
}) as BenchmarkRow;

describe("provenance des références de marché", () => {
  it("refuse un échantillon insuffisant", () => {
    expect(isMeasuredBenchmark(base({ sample_count: 4 }))).toBe(false);
  });

  it("refuse une référence sans date issue des données réelles", () => {
    expect(isMeasuredBenchmark(base({ last_updated_from_actuals: null as never }))).toBe(false);
  });

  it("refuse une référence périmée", () => {
    const old = new Date(Date.now() - 1000 * 60 * 60 * 24 * 365 * 4).toISOString();
    expect(isMeasuredBenchmark(base({ last_updated_from_actuals: old }))).toBe(false);
  });

  it("accepte une référence réellement mesurée et récente", () => {
    expect(isMeasuredBenchmark(base())).toBe(true);
  });

  it("sans référence mesurée, l'estimation reste Inféré", () => {
    const est = computeEstimate({
      category: "cuisine",
      sizeSqft: 150,
      scope: "standard",
      addons: [],
      propertyKind: "maison",
      age: "1980_2000",
      citySlug: null,
      benchmarks: [],
    });
    expect(est.provenance).toBe("Inféré");
    expect(est.benchmark.verifiedComponents).toBe(0);
  });
});

describe("clés de ville", () => {
  it("utilise le slug canonique de Trois-Rivières", () => {
    expect(CITY_FACTORS["trois-rivieres"]).toBeGreaterThan(0);
    expect((CITY_FACTORS as Record<string, number>).trois_rivieres).toBeUndefined();
  });
});
