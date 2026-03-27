/**
 * UNPRO — Zone Value Scoring Engine
 * Calculates ZoneValueScore and exclusivity eligibility.
 */

export interface ZoneScoreInput {
  demandVolume: number;
  avgPredictedProfitCents: number;
  supplyScarcity: number;      // 0-100
  competitionScore: number;    // 0-100
  conversionFrequency: number; // 0-1
  seasonalityFactor: number;   // 0.5-2.0
}

export interface ZoneScoreResult {
  zoneValueScore: number;
  exclusivityEligible: boolean;
  suggestedPremiumCents: number;
  revenueProjectionMonthlyCents: number;
  justification: { factor: string; value: number; weight: number; contribution: number }[];
}

const WEIGHTS = {
  demand: 0.25,
  profit: 0.20,
  scarcity: 0.20,
  competition: 0.15,
  conversion: 0.12,
  seasonality: 0.08,
};

export function calculateZoneValueScore(input: ZoneScoreInput): ZoneScoreResult {
  const demandNorm = Math.min(input.demandVolume / 50, 100);
  const profitNorm = Math.min(input.avgPredictedProfitCents / 500000, 100);
  const scarcityNorm = input.supplyScarcity;
  const competitionNorm = 100 - input.competitionScore;
  const conversionNorm = input.conversionFrequency * 100;
  const seasonNorm = Math.min(input.seasonalityFactor * 50, 100);

  const justification = [
    { factor: "Demande", value: demandNorm, weight: WEIGHTS.demand, contribution: demandNorm * WEIGHTS.demand },
    { factor: "Profit moyen", value: profitNorm, weight: WEIGHTS.profit, contribution: profitNorm * WEIGHTS.profit },
    { factor: "Rareté offre", value: scarcityNorm, weight: WEIGHTS.scarcity, contribution: scarcityNorm * WEIGHTS.scarcity },
    { factor: "Faible compétition", value: competitionNorm, weight: WEIGHTS.competition, contribution: competitionNorm * WEIGHTS.competition },
    { factor: "Fréquence conversion", value: conversionNorm, weight: WEIGHTS.conversion, contribution: conversionNorm * WEIGHTS.conversion },
    { factor: "Saisonnalité", value: seasonNorm, weight: WEIGHTS.seasonality, contribution: seasonNorm * WEIGHTS.seasonality },
  ];

  const zoneValueScore = Math.round(justification.reduce((s, j) => s + j.contribution, 0));
  const exclusivityEligible = zoneValueScore >= 65 && input.supplyScarcity >= 60;

  const baseMonthlyLeads = Math.max(input.demandVolume, 3);
  const avgLeadPrice = Math.round(input.avgPredictedProfitCents * 0.18);
  const revenueProjectionMonthlyCents = baseMonthlyLeads * avgLeadPrice;
  const suggestedPremiumCents = Math.round(revenueProjectionMonthlyCents * 0.35);

  return { zoneValueScore, exclusivityEligible, suggestedPremiumCents, revenueProjectionMonthlyCents, justification };
}

export function formatCentsCAD(cents: number): string {
  return new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(cents / 100).replace(/\s/g, "\u00A0");
}
