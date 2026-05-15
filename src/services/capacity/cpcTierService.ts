/**
 * UNPRO — CPC Tier Service
 * Maps Google Ads CPC (CAD) to competitiveness tier and pricing/cap factors.
 */

export type CpcTier = "S" | "A" | "B" | "C" | "D";

export interface CpcTierFactors {
  tier: CpcTier;
  capFactor: number;     // multiplies base cap
  priceFactor: number;   // multiplies premium price
  label: string;
}

export function cpcToTier(cpcCad: number): CpcTier {
  if (cpcCad >= 25) return "S";
  if (cpcCad >= 15) return "A";
  if (cpcCad >= 7)  return "B";
  if (cpcCad >= 3)  return "C";
  return "D";
}

const TABLE: Record<CpcTier, Omit<CpcTierFactors, "tier">> = {
  S: { capFactor: 0.80, priceFactor: 1.60, label: "Ultra-compétitif" },
  A: { capFactor: 0.90, priceFactor: 1.30, label: "Très compétitif" },
  B: { capFactor: 1.00, priceFactor: 1.15, label: "Compétitif" },
  C: { capFactor: 1.10, priceFactor: 1.00, label: "Modéré" },
  D: { capFactor: 1.20, priceFactor: 0.85, label: "Faible" },
};

export function getTierFactors(tier: CpcTier): CpcTierFactors {
  return { tier, ...TABLE[tier] };
}

export function getFactorsFromCpc(cpcCad: number): CpcTierFactors {
  return getTierFactors(cpcToTier(cpcCad));
}
