/**
 * UNPRO — Capacity Engine
 * Computes final cap, saturation, band per (trade × city).
 */
import { getFactorsFromCpc, type CpcTier } from "./cpcTierService";

export interface CapacityRule {
  trade_slug: string;
  family: string;
  inhabitants_per_pro: number;
  min_cap_per_city: number;
  max_cap_per_city: number;
  seasonality: Record<string, number>;
}

export interface CapacityInput {
  rule: CapacityRule;
  population: number;
  cpcCad: number;
  activePros: number;
  month?: number;          // 1-12
  clusterDensity?: number; // 0.7 (rural) → 1.2 (dense urban)
  demandSignal?: number;   // 0.7 → 1.4 based on intents/leads last 90d
  qualityBonus?: number;   // +/- to saturation score
}

export type CapacityBand = "green" | "yellow" | "red";

export interface CapacityResult {
  baseCap: number;
  finalCap: number;
  activePros: number;
  saturationScore: number;
  band: CapacityBand;
  cpcTier: CpcTier;
  gap: number;
  factors: {
    populationFactor: number;
    cpcFactor: number;
    seasonalityFactor: number;
    clusterFactor: number;
    demandFactor: number;
  };
}

function getSeason(month: number): "winter" | "spring" | "summer" | "fall" {
  if ([12, 1, 2].includes(month)) return "winter";
  if ([3, 4, 5].includes(month)) return "spring";
  if ([6, 7, 8].includes(month)) return "summer";
  return "fall";
}

export function computeCapacity(input: CapacityInput): CapacityResult {
  const month = input.month ?? new Date().getMonth() + 1;
  const season = getSeason(month);

  const populationFactor = Math.max(input.population, 0) / Math.max(input.rule.inhabitants_per_pro, 1);
  const cpc = getFactorsFromCpc(input.cpcCad);
  const seasonalityFactor = input.rule.seasonality?.[season] ?? 1;
  const clusterFactor = input.clusterDensity ?? 1;
  const demandFactor = input.demandSignal ?? 1;

  const baseCap = Math.round(populationFactor);
  const adjusted = baseCap * cpc.capFactor * seasonalityFactor * clusterFactor * demandFactor;
  const finalCap = Math.max(
    input.rule.min_cap_per_city,
    Math.min(input.rule.max_cap_per_city, Math.round(adjusted))
  );

  const rawSaturation = finalCap > 0 ? (input.activePros / finalCap) * 100 : 0;
  const saturationScore = Math.max(0, Math.min(100, rawSaturation + (input.qualityBonus ?? 0)));

  const band: CapacityBand =
    saturationScore >= 81 ? "red" : saturationScore >= 51 ? "yellow" : "green";

  return {
    baseCap,
    finalCap,
    activePros: input.activePros,
    saturationScore: Math.round(saturationScore * 100) / 100,
    band,
    cpcTier: cpc.tier,
    gap: Math.max(0, finalCap - input.activePros),
    factors: { populationFactor, cpcFactor: cpc.capFactor, seasonalityFactor, clusterFactor, demandFactor },
  };
}

export function bandLabelFr(band: CapacityBand): string {
  if (band === "red") return "Bientôt complet";
  if (band === "yellow") return "Places limitées";
  return "Disponible";
}
