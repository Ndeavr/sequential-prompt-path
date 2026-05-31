export type PlanSlug = "recrue" | "pro" | "premium" | "elite" | "signature" | "custom";

export interface GrowthProfile {
  monthlyCapacity: number;
  avgTicketCents: number;
  teamsCount: number;
  targetGrowthPercent: number;
  preferredJobTypes: string[];
  preferredTerritories: string[];
  wantsExclusivity: boolean;
  maxDistanceKm: number;
  qualityVsVolume: number; // 0=volume, 100=quality
  seasonalityNotes?: string;
}

export interface MarketScore {
  territory: string;
  trade: string;
  competitionScore: number;
  avgCpcCents: number;
  demandScore: number;
  avgProjectValueCents: number;
  aiDifficultyScore: number;
  rarityScore: number;
  exclusivitySlotsTotal: number;
  exclusivitySlotsTaken: number;
  recommendedMinPlan: PlanSlug;
  seasonalityMultiplier: number;
}

export interface PricingCoefficients {
  competition_weight: number;
  demand_weight: number;
  ticket_weight: number;
  exclusivity_premium: number;
  rarity_premium: number;
  seasonality_weight: number;
  min_price_floor_cents: number;
  max_price_ceiling_cents: number;
}

export interface PricingOverride {
  contractor_id?: string | null;
  territory?: string | null;
  trade?: string | null;
  forced_price_cents?: number | null;
  forced_plan_slug?: PlanSlug | null;
  reason: string;
}

export type ExclusivityLevel = "none" | "partial" | "full";
export type TerritoryPriority = "low" | "medium" | "high" | "critical";

export interface PlanRecommendation {
  recommendedPlanSlug: PlanSlug;
  recommendedPriceCents: number;
  basePlanPriceCents: number;
  priceModifierPct: number;
  estimatedMonthlyAppointmentsMin: number;
  estimatedMonthlyAppointmentsMax: number;
  estimatedRevenueMinCents: number;
  estimatedRevenueMaxCents: number;
  exclusivityLevel: ExclusivityLevel;
  territoryPriority: TerritoryPriority;
  marketScore: number;
  opportunityScore: number;
  competitionScore: number;
  reason: {
    bullets: string[];
    marketModifierPct: number;
    exclusivityModifierPct: number;
    rarityModifierPct: number;
    seasonalityModifierPct: number;
    overrideApplied: boolean;
  };
}

export const PLAN_BASE_PRICES_CENTS: Record<Exclude<PlanSlug, "custom">, number> = {
  recrue: 14900,
  pro: 34900,
  premium: 59900,
  elite: 99900,
  signature: 179900,
};

export const PLAN_ORDER: PlanSlug[] = ["recrue", "pro", "premium", "elite", "signature"];

export const PLAN_LABELS: Record<PlanSlug, string> = {
  recrue: "Recrue",
  pro: "Pro",
  premium: "Premium IA",
  elite: "Élite",
  signature: "Signature",
  custom: "Sur mesure",
};
