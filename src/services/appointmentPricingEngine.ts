/**
 * UNPRO — Dynamic Pricing Engine for Exclusive Appointments
 * price = base_price × demand × competition × urgency × project_value × precision × complexity × availability
 * All prices in cents. Never sells shared leads.
 */

// ─── Plan base prices (cents) ───
export const PLAN_BASE_PRICES: Record<string, { S: number; M: number; L: number; XL: number; XXL: number }> = {
  recrue:    { S: 1500, M: 5000, L: 0,     XL: 0,     XXL: 0 },
  pro:       { S: 1500, M: 5000, L: 12000, XL: 0,     XXL: 0 },
  premium:   { S: 1500, M: 5000, L: 12000, XL: 25000, XXL: 0 },
  elite:     { S: 1500, M: 5000, L: 12000, XL: 25000, XXL: 50000 },
  signature: { S: 1500, M: 5000, L: 12000, XL: 25000, XXL: 50000 },
};

export type ProjectSize = "S" | "M" | "L" | "XL" | "XXL";

export function getProjectSize(estimatedValueCents: number): ProjectSize {
  if (estimatedValueCents <= 200000) return "S";      // < $2,000
  if (estimatedValueCents <= 1000000) return "M";     // < $10,000
  if (estimatedValueCents <= 3000000) return "L";     // < $30,000
  if (estimatedValueCents <= 7500000) return "XL";    // < $75,000
  return "XXL";                                        // $75,000+
}

export function canAccessSize(planTier: string, size: ProjectSize): boolean {
  const base = PLAN_BASE_PRICES[planTier];
  if (!base) return false;
  return base[size] > 0;
}

// ─── Multiplier inputs ───
export interface PricingContext {
  planTier: string;
  estimatedProjectValueCents: number;
  citySlug: string;
  tradeSlug: string;
  urgencyLevel: "low" | "medium" | "high" | "emergency";
  complexityLevel: "simple" | "moderate" | "complex" | "expert";
  matchQualityScore: number; // 0-100
  demandCount: number;       // active requests in city+trade
  supplyCount: number;       // available contractors
}

export interface MultiplierBreakdown {
  demand: number;
  competition: number;
  urgency: number;
  projectValue: number;
  precision: number;
  complexity: number;
  availability: number;
}

export interface PricingResult {
  basePriceCents: number;
  projectSize: ProjectSize;
  multipliers: MultiplierBreakdown;
  combinedMultiplier: number;
  rawPriceCents: number;
  finalPriceCents: number;
  priceFloorCents: number;
  priceCeilingCents: number;
  isSurge: boolean;
  surgeReason: string | null;
  justifications: PriceJustification[];
  canAccess: boolean;
}

export interface PriceJustification {
  factor: string;
  labelFr: string;
  multiplier: number;
  impact: "increase" | "decrease" | "neutral";
  explanation: string;
}

// ─── Multiplier calculations ───

function calcDemandMultiplier(demandCount: number, supplyCount: number): number {
  if (supplyCount === 0) return 2.0;
  const ratio = demandCount / supplyCount;
  if (ratio >= 3) return 1.8;
  if (ratio >= 2) return 1.4;
  if (ratio >= 1) return 1.1;
  if (ratio >= 0.5) return 1.0;
  return 0.8; // oversupply
}

function calcCompetitionMultiplier(supplyCount: number): number {
  if (supplyCount <= 2) return 1.4;  // rare, premium
  if (supplyCount <= 5) return 1.2;
  if (supplyCount <= 15) return 1.0;
  return 0.85; // lots of competition
}

function calcUrgencyMultiplier(level: string): number {
  const map: Record<string, number> = {
    emergency: 1.8,
    high: 1.4,
    medium: 1.0,
    low: 0.9,
  };
  return map[level] ?? 1.0;
}

function calcProjectValueMultiplier(estimatedCents: number): number {
  if (estimatedCents >= 7500000) return 2.5;
  if (estimatedCents >= 3000000) return 1.8;
  if (estimatedCents >= 1000000) return 1.3;
  if (estimatedCents >= 200000) return 1.0;
  return 0.7;
}

function calcPrecisionMultiplier(matchScore: number): number {
  // High precision = higher value to contractor = higher price
  if (matchScore >= 90) return 1.6;
  if (matchScore >= 75) return 1.3;
  if (matchScore >= 60) return 1.0;
  if (matchScore >= 40) return 0.8;
  return 0.6; // low match = low value = cheaper or rejected
}

function calcComplexityMultiplier(level: string): number {
  const map: Record<string, number> = {
    expert: 1.8,
    complex: 1.4,
    moderate: 1.0,
    simple: 0.85,
  };
  return map[level] ?? 1.0;
}

function calcAvailabilityMultiplier(supplyCount: number, demandCount: number): number {
  if (supplyCount === 0) return 1.5;
  const ratio = supplyCount / Math.max(demandCount, 1);
  if (ratio >= 3) return 0.8;
  if (ratio >= 1.5) return 0.9;
  if (ratio >= 0.5) return 1.0;
  return 1.3;
}

// ─── Justification builder ───

function buildJustification(factor: string, labelFr: string, multiplier: number, explanation: string): PriceJustification {
  return {
    factor,
    labelFr,
    multiplier,
    impact: multiplier > 1.05 ? "increase" : multiplier < 0.95 ? "decrease" : "neutral",
    explanation,
  };
}

// ─── Main engine ───

export function calculateAppointmentPrice(ctx: PricingContext): PricingResult {
  const projectSize = getProjectSize(ctx.estimatedProjectValueCents);
  const canAccess = canAccessSize(ctx.planTier, projectSize);
  const basePriceCents = PLAN_BASE_PRICES[ctx.planTier]?.[projectSize] ?? 0;

  const multipliers: MultiplierBreakdown = {
    demand: calcDemandMultiplier(ctx.demandCount, ctx.supplyCount),
    competition: calcCompetitionMultiplier(ctx.supplyCount),
    urgency: calcUrgencyMultiplier(ctx.urgencyLevel),
    projectValue: calcProjectValueMultiplier(ctx.estimatedProjectValueCents),
    precision: calcPrecisionMultiplier(ctx.matchQualityScore),
    complexity: calcComplexityMultiplier(ctx.complexityLevel),
    availability: calcAvailabilityMultiplier(ctx.supplyCount, ctx.demandCount),
  };

  const combinedMultiplier = Object.values(multipliers).reduce((a, b) => a * b, 1);
  const rawPriceCents = Math.round(basePriceCents * combinedMultiplier);

  const priceFloorCents = 500;   // $5 minimum
  const priceCeilingCents = 100000; // $1,000 maximum
  const finalPriceCents = Math.max(priceFloorCents, Math.min(priceCeilingCents, rawPriceCents));

  // Surge detection
  const isSurge = multipliers.demand >= 1.4 && multipliers.availability >= 1.2;
  const surgeReason = isSurge
    ? `Forte demande (${ctx.demandCount} projets) avec peu de disponibilité (${ctx.supplyCount} entrepreneurs) pour ${ctx.tradeSlug} à ${ctx.citySlug}`
    : null;

  const justifications: PriceJustification[] = [
    buildJustification("demand", "Demande locale", multipliers.demand,
      multipliers.demand > 1.1 ? "Forte demande dans votre zone" : "Demande normale"),
    buildJustification("competition", "Compétition", multipliers.competition,
      multipliers.competition > 1.1 ? "Peu de compétiteurs — rendez-vous premium" : "Compétition normale"),
    buildJustification("urgency", "Urgence", multipliers.urgency,
      ctx.urgencyLevel === "emergency" ? "Projet urgent — taux de conversion élevé" : "Urgence standard"),
    buildJustification("projectValue", "Valeur du projet", multipliers.projectValue,
      `Projet estimé à ${formatCents(ctx.estimatedProjectValueCents)}`),
    buildJustification("precision", "Précision du matching", multipliers.precision,
      ctx.matchQualityScore >= 75 ? "Excellent match — forte probabilité de fermeture" : "Match moyen"),
    buildJustification("complexity", "Complexité", multipliers.complexity,
      ctx.complexityLevel === "expert" ? "Expertise rare requise" : "Complexité standard"),
    buildJustification("availability", "Disponibilité", multipliers.availability,
      multipliers.availability > 1.1 ? "Peu d'entrepreneurs disponibles" : "Bonne disponibilité"),
  ];

  return {
    basePriceCents,
    projectSize,
    multipliers,
    combinedMultiplier: Math.round(combinedMultiplier * 1000) / 1000,
    rawPriceCents,
    finalPriceCents,
    priceFloorCents,
    priceCeilingCents,
    isSurge,
    surgeReason,
    justifications,
    canAccess,
  };
}

export function formatCents(cents: number): string {
  const dollars = cents / 100;
  return new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(dollars).replace(/\s/g, "\u00A0");
}

// ─── Plan access matrix ───
export const PLAN_ACCESS: Record<string, { sizes: ProjectSize[]; priority: number; autoAccept: boolean }> = {
  recrue:    { sizes: ["S", "M"], priority: 1, autoAccept: false },
  pro:       { sizes: ["S", "M", "L"], priority: 2, autoAccept: false },
  premium:   { sizes: ["S", "M", "L", "XL"], priority: 3, autoAccept: true },
  elite:     { sizes: ["S", "M", "L", "XL", "XXL"], priority: 4, autoAccept: true },
  signature: { sizes: ["S", "M", "L", "XL", "XXL"], priority: 5, autoAccept: true },
};
