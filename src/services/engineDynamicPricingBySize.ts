/**
 * EngineDynamicPricingBySize
 * Prix dynamiques ajustés en temps réel par taille + rareté + cluster + saison + demande.
 */

import type { ProjectSizeCode, PlanCode, ScarcityStatus, ClusterValueTier } from "./clusterProjectSizeMatrixEngine";

export interface DynamicPriceFactors {
  baseMonthlyPrice: number;
  sizeMultiplier: number;
  scarcityMultiplier: number;
  clusterValueMultiplier: number;
  seasonalMultiplier: number;
  demandMultiplier: number;
}

export interface DynamicPriceResult {
  finalMonthlyPrice: number;
  finalAnnualPrice: number;
  factors: DynamicPriceFactors;
  pricingTier: "discount" | "standard" | "premium" | "surge";
  priceChangePercent: number; // vs base
  breakdown: string;
}

export interface PricingSnapshot {
  id: string;
  cluster: string;
  domain: string;
  planCode: PlanCode;
  planName: string;
  sizeCode: ProjectSizeCode;
  baseMonthlyPrice: number;
  finalMonthlyPrice: number;
  finalAnnualPrice: number;
  sizeMultiplier: number;
  scarcityMultiplier: number;
  clusterValueMultiplier: number;
  seasonalMultiplier: number;
  demandMultiplier: number;
  pricingTier: string;
  snapshotAt: string;
}

// Base prices
const BASE_PRICES: Record<PlanCode, number> = {
  recrue: 99,
  pro: 199,
  premium: 399,
  elite: 699,
  signature: 1499,
};

// Size multipliers
const SIZE_MULTIPLIERS: Record<ProjectSizeCode, number> = {
  xs: 0.50,
  s: 0.70,
  m: 1.00,
  l: 1.30,
  xl: 1.70,
  xxl: 2.50,
};

// Scarcity multipliers
const SCARCITY_MULTIPLIERS: Record<ScarcityStatus, number> = {
  open: 1.00,
  tight: 1.10,
  rare: 1.25,
  full: 1.50,
  locked: 1.75,
};

// Cluster value multipliers
const CLUSTER_VALUE_MULTIPLIERS: Record<ClusterValueTier, number> = {
  low: 0.90,
  medium: 1.00,
  high: 1.15,
  elite: 1.30,
};

// Seasonal multipliers (month-based, 1-indexed)
const SEASONAL_MULTIPLIERS: Record<number, number> = {
  1: 0.85, // Janvier — basse saison
  2: 0.90,
  3: 1.00,
  4: 1.10, // Printemps — reprise
  5: 1.15,
  6: 1.20, // Été — haute saison
  7: 1.20,
  8: 1.15,
  9: 1.10,
  10: 1.05,
  11: 0.95, // Automne — déclin
  12: 0.85, // Décembre — basse saison
};

/**
 * Get current seasonal multiplier
 */
export function getSeasonalMultiplier(month?: number): number {
  const m = month ?? new Date().getMonth() + 1;
  return SEASONAL_MULTIPLIERS[m] ?? 1.00;
}

/**
 * Compute demand multiplier based on occupancy and trend
 */
export function computeDemandMultiplier(occupancyRate: number, growthTrend: number = 0): number {
  let multiplier = 1.00;
  if (occupancyRate > 0.8) multiplier += 0.10;
  if (occupancyRate > 0.9) multiplier += 0.10;
  if (growthTrend > 0.05) multiplier += 0.05;
  if (growthTrend > 0.15) multiplier += 0.10;
  if (occupancyRate < 0.4) multiplier -= 0.10;
  return Math.max(0.80, Math.min(1.30, Math.round(multiplier * 100) / 100));
}

/**
 * Compute final dynamic price
 */
export function computeDynamicPrice(
  planCode: PlanCode,
  sizeCode: ProjectSizeCode,
  scarcityStatus: ScarcityStatus = "open",
  clusterValueTier: ClusterValueTier = "medium",
  occupancyRate: number = 0.5,
  month?: number
): DynamicPriceResult {
  const base = BASE_PRICES[planCode];
  const sizeMul = SIZE_MULTIPLIERS[sizeCode];
  const scarcityMul = SCARCITY_MULTIPLIERS[scarcityStatus];
  const clusterMul = CLUSTER_VALUE_MULTIPLIERS[clusterValueTier];
  const seasonalMul = getSeasonalMultiplier(month);
  const demandMul = computeDemandMultiplier(occupancyRate);

  const finalMonthly = Math.round(base * sizeMul * scarcityMul * clusterMul * seasonalMul * demandMul * 100) / 100;
  const finalAnnual = Math.round(finalMonthly * 12 * 100) / 100;
  const changePercent = Math.round(((finalMonthly - base) / base) * 100);

  let tier: DynamicPriceResult["pricingTier"] = "standard";
  if (changePercent > 40) tier = "surge";
  else if (changePercent > 15) tier = "premium";
  else if (changePercent < -10) tier = "discount";

  return {
    finalMonthlyPrice: finalMonthly,
    finalAnnualPrice: finalAnnual,
    factors: {
      baseMonthlyPrice: base,
      sizeMultiplier: sizeMul,
      scarcityMultiplier: scarcityMul,
      clusterValueMultiplier: clusterMul,
      seasonalMultiplier: seasonalMul,
      demandMultiplier: demandMul,
    },
    pricingTier: tier,
    priceChangePercent: changePercent,
    breakdown: `${base}$ × ${sizeMul} (size) × ${scarcityMul} (scarcity) × ${clusterMul} (cluster) × ${seasonalMul} (season) × ${demandMul} (demand) = ${finalMonthly}$`,
  };
}

/**
 * Get pricing tier badge info
 */
export function getPricingTierInfo(tier: DynamicPriceResult["pricingTier"]): { label: string; color: string } {
  switch (tier) {
    case "discount": return { label: "Réduction", color: "text-emerald-400" };
    case "standard": return { label: "Standard", color: "text-blue-400" };
    case "premium": return { label: "Premium", color: "text-purple-400" };
    case "surge": return { label: "Surge", color: "text-red-400" };
  }
}

// Generate mock snapshots
export function generateMockSnapshots(): PricingSnapshot[] {
  const clusters = ["Laval", "Montréal-Nord", "Longueuil", "Québec"];
  const domains = ["Isolation", "Toiture", "Plomberie", "Rénovation"];
  const plans: { code: PlanCode; name: string }[] = [
    { code: "recrue", name: "Recrue" },
    { code: "pro", name: "Pro" },
    { code: "premium", name: "Premium" },
    { code: "elite", name: "Élite" },
    { code: "signature", name: "Signature" },
  ];
  const sizes: ProjectSizeCode[] = ["xs", "s", "m", "l", "xl", "xxl"];
  const scarcities: ScarcityStatus[] = ["open", "tight", "rare"];
  const tiers: ClusterValueTier[] = ["medium", "high", "elite"];

  const snapshots: PricingSnapshot[] = [];
  let id = 0;

  for (const cluster of clusters.slice(0, 2)) {
    for (const domain of domains.slice(0, 2)) {
      for (const plan of plans) {
        for (const size of sizes) {
          const scarcity = scarcities[id % scarcities.length];
          const tier = tiers[id % tiers.length];
          const result = computeDynamicPrice(plan.code, size, scarcity, tier, 0.6 + (id % 4) * 0.1);
          snapshots.push({
            id: `snap-${++id}`,
            cluster,
            domain,
            planCode: plan.code,
            planName: plan.name,
            sizeCode: size,
            baseMonthlyPrice: result.factors.baseMonthlyPrice,
            finalMonthlyPrice: result.finalMonthlyPrice,
            finalAnnualPrice: result.finalAnnualPrice,
            sizeMultiplier: result.factors.sizeMultiplier,
            scarcityMultiplier: result.factors.scarcityMultiplier,
            clusterValueMultiplier: result.factors.clusterValueMultiplier,
            seasonalMultiplier: result.factors.seasonalMultiplier,
            demandMultiplier: result.factors.demandMultiplier,
            pricingTier: result.pricingTier,
            snapshotAt: new Date().toISOString(),
          });
        }
      }
    }
  }

  return snapshots;
}
