/**
 * UNPRO — Moteur d'estimation de rénovation (déterministe, testable).
 *
 * base (taux × superficie × facteurs) + options sélectionnées + imprévus
 * → sous-total → taxes affichées séparément.
 *
 * Garanties : sortie toujours finie, jamais négative, min ≤ max, arrondis
 * stables. Aucune fausse précision : le point milieu n'apparaît que si la
 * confiance le permet.
 */
import {
  AGE_FACTOR,
  CATEGORIES,
  CITY_FACTOR,
  DEFAULT_CITY_FACTOR,
  ESTIMATOR_CONFIG_VERSION,
  ESTIMATOR_EFFECTIVE_DATE,
  PROPERTY_FACTOR,
  TAX_GST,
  TAX_QST,
  type BuildingAge,
  type PropertyKind,
  type RenoCategory,
  type ScopeLevel,
} from "./catalog";

export type Provenance = "Vérifié" | "Déclaré" | "Inféré" | "En attente";

/** Référence réelle issue de market_price_benchmarks (composante → coût unitaire). */
export interface BenchmarkRow {
  component: string;
  avg_cost_per_unit: number;
  unit_type: string;
  sample_count: number | null;
  last_updated_from_actuals: string | null;
}

export interface EstimatorInput {
  category: RenoCategory;
  sizeSqft: number;
  scope: ScopeLevel;
  addons: string[];
  propertyKind: PropertyKind;
  age: BuildingAge;
  citySlug?: string | null;
}

export interface EstimateLine {
  id: string;
  label: string;
  min: number;
  max: number;
  provenance: Provenance;
}

export interface EstimateResult {
  baseMin: number;
  baseMax: number;
  optionsMin: number;
  optionsMax: number;
  contingencyMin: number;
  contingencyMax: number;
  subtotalMin: number;
  subtotalMax: number;
  taxesMin: number;
  taxesMax: number;
  totalMin: number;
  totalMax: number;
  /** Point milieu seulement si la confiance le justifie. */
  likely: number | null;
  confidence: "faible" | "moyenne" | "élevée";
  provenance: Provenance;
  lines: EstimateLine[];
  assumptions: string[];
  exclusions: string[];
  benchmark: {
    version: string;
    effectiveDate: string;
    verifiedComponents: number;
    cityFactor: number;
  };
}

const CONTINGENCY_MIN = 0.08;
const CONTINGENCY_MAX = 0.15;

function safeNumber(n: number, fallback = 0): number {
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function roundTo(n: number, step: number): number {
  return Math.round(safeNumber(n) / step) * step;
}

export function cityFactorFor(citySlug?: string | null): number {
  if (!citySlug) return DEFAULT_CITY_FACTOR;
  const key = citySlug.trim().toLowerCase().replace(/\s+/g, "-");
  return CITY_FACTOR[key] ?? DEFAULT_CITY_FACTOR;
}

/** Fraîcheur maximale acceptée pour une composante réellement mesurée. */
export const BENCHMARK_MAX_AGE_MONTHS = 24;

/**
 * Une composante n'est « Vérifié » que si elle provient réellement de projets
 * mesurés : échantillon suffisant ET date de mise à jour issue des données
 * réelles, encore récente. Sinon la référence de marché reste « Inféré ».
 * « Déclaré » est réservé aux faits fournis par le propriétaire.
 */
export function isMeasuredBenchmark(row: BenchmarkRow | undefined, now = new Date()): boolean {
  if (!row) return false;
  if ((row.sample_count ?? 0) < 5) return false;
  if (!Number.isFinite(row.avg_cost_per_unit) || row.avg_cost_per_unit <= 0) return false;
  if (!row.last_updated_from_actuals) return false;
  const t = Date.parse(row.last_updated_from_actuals);
  if (!Number.isFinite(t)) return false;
  const months = (now.getTime() - t) / (1000 * 60 * 60 * 24 * 30.44);
  return months >= 0 && months <= BENCHMARK_MAX_AGE_MONTHS;
}

function addonRange(
  addonMin: number,
  addonMax: number,
  component: string | undefined,
  benchmarks: Map<string, BenchmarkRow>,
  sizeSqft: number,
): { min: number; max: number; provenance: Provenance } {
  if (!component) return { min: addonMin, max: addonMax, provenance: "Inféré" };
  const row = benchmarks.get(component);
  if (!isMeasuredBenchmark(row)) {
    return { min: addonMin, max: addonMax, provenance: "Inféré" };
  }
  const unit = row!.unit_type === "sqft" ? Math.max(sizeSqft, 1) : 1;
  const mid = safeNumber(row!.avg_cost_per_unit) * unit;
  if (mid <= 0) return { min: addonMin, max: addonMax, provenance: "Inféré" };
  return {
    min: Math.round(mid * 0.85),
    max: Math.round(mid * 1.25),
    provenance: "Vérifié",
  };
}

export function computeRenovationEstimate(
  input: EstimatorInput,
  benchmarkRows: BenchmarkRow[] = [],
): EstimateResult {
  const def = CATEGORIES[input.category] ?? CATEGORIES.cuisine;
  const benchmarks = new Map(benchmarkRows.map((r) => [r.component, r]));

  const size = Math.min(
    Math.max(safeNumber(input.sizeSqft, def.sizeDefault), def.sizeMin),
    def.sizeMax,
  );
  const rate = def.rates[input.scope] ?? def.rates.standard;
  const factor =
    (PROPERTY_FACTOR[input.propertyKind] ?? 1) *
    (def.asksAge ? AGE_FACTOR[input.age] ?? 1 : 1) *
    cityFactorFor(input.citySlug);

  const baseMinRaw = rate.min * size * factor;
  const baseMaxRaw = rate.max * size * factor;
  const baseMin = roundTo(Math.min(baseMinRaw, baseMaxRaw), 100);
  const baseMax = roundTo(Math.max(baseMinRaw, baseMaxRaw), 100);

  const lines: EstimateLine[] = [
    { id: "base", label: "Travaux de base", min: baseMin, max: baseMax, provenance: "Inféré" },
  ];

  let optionsMin = 0;
  let optionsMax = 0;
  let verifiedComponents = 0;

  for (const addon of def.addons) {
    if (!input.addons.includes(addon.id)) continue;
    const r = addonRange(addon.min, addon.max, addon.benchmarkComponent, benchmarks, size);
    const lo = roundTo(Math.min(r.min, r.max), 50);
    const hi = roundTo(Math.max(r.min, r.max), 50);
    optionsMin += lo;
    optionsMax += hi;
    if (r.provenance === "Vérifié") verifiedComponents += 1;
    lines.push({ id: addon.id, label: addon.label, min: lo, max: hi, provenance: r.provenance });
  }

  const contingencyMin = roundTo((baseMin + optionsMin) * CONTINGENCY_MIN, 50);
  const contingencyMax = roundTo((baseMax + optionsMax) * CONTINGENCY_MAX, 50);

  const subtotalMin = baseMin + optionsMin + contingencyMin;
  const subtotalMax = Math.max(baseMax + optionsMax + contingencyMax, subtotalMin);

  const taxRate = TAX_GST + TAX_QST;
  const taxesMin = Math.round(subtotalMin * taxRate);
  const taxesMax = Math.round(subtotalMax * taxRate);

  const totalMin = subtotalMin + taxesMin;
  const totalMax = Math.max(subtotalMax + taxesMax, totalMin);

  const spread = totalMax > 0 ? (totalMax - totalMin) / totalMax : 1;
  const confidence: EstimateResult["confidence"] =
    input.age === "inconnu" || input.category === "renovation_complete"
      ? "faible"
      : spread <= 0.35
        ? "élevée"
        : "moyenne";

  const provenance: Provenance = verifiedComponents > 0 ? "Vérifié" : "Inféré";
  const likely = confidence === "faible" ? null : Math.round((totalMin + totalMax) / 2 / 100) * 100;

  const assumptions = [
    `Superficie considérée : ${Math.round(size)} ${def.sizeUnit}.`,
    "Main-d'œuvre et matériaux du marché résidentiel québécois.",
    `Imprévus inclus : ${Math.round(CONTINGENCY_MIN * 100)} à ${Math.round(CONTINGENCY_MAX * 100)} %.`,
    "Taxes TPS et TVQ affichées séparément.",
  ];
  const exclusions = [
    "Permis municipaux et frais professionnels (plans, ingénierie).",
    "Décontamination, amiante, vermiculite ou surprises structurales.",
    "Mobilier, décoration et aménagement extérieur.",
  ];

  return {
    baseMin,
    baseMax,
    optionsMin,
    optionsMax,
    contingencyMin,
    contingencyMax,
    subtotalMin,
    subtotalMax,
    taxesMin,
    taxesMax,
    totalMin,
    totalMax,
    likely,
    confidence,
    provenance,
    lines,
    assumptions,
    exclusions,
    benchmark: {
      version: ESTIMATOR_CONFIG_VERSION,
      effectiveDate: ESTIMATOR_EFFECTIVE_DATE,
      verifiedComponents,
      cityFactor: cityFactorFor(input.citySlug),
    },
  };
}

export function formatCad(n: number): string {
  return new Intl.NumberFormat("fr-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(n) ? n : 0);
}
