import { PLAN_PRICE_MAP } from "@/config/contractorPlans";

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

// CANONICAL PRICING — derived from src/config/contractorPlans.ts (mirrors
// public.plans). Never hardcode a plan price here.
export const PLAN_BASE_PRICES_CENTS: Record<Exclude<PlanSlug, "custom">, number> = {
  recrue: PLAN_PRICE_MAP.recrue * 100,
  pro: PLAN_PRICE_MAP.pro * 100,
  premium: PLAN_PRICE_MAP.premium * 100,
  elite: PLAN_PRICE_MAP.elite * 100,
  signature: PLAN_PRICE_MAP.signature * 100,
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
