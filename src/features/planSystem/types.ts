/**
 * UNPRO — Plan System Types
 * Canonical types for the AI Visibility OS plan matrix.
 */

export type PlanCode = "recrue" | "pro" | "premium" | "elite" | "signature";

export type FeatureKey =
  | "ai_index_priority"
  | "aeo_blocks_published"
  | "booking_direct"
  | "route_optimization"
  | "territory_lock"
  | "priority_dispatch"
  | "analytics_advanced"
  | "priority_support";

export interface Plan {
  id: string;
  code: PlanCode;
  name: string;
  tierRank: number;
  monthlyPrice: number; // cents
  yearlyPrice: number; // cents
  oneTimePrice: number; // cents
  visibilityMultiplier: number;
  recommendationMultiplier: number;
  aiIndexPriority: number;
  trustBoost: number;
  seoBoost: number;
  citationBoost: number;
  territoryRadiusKm: number;
  bookingPriority: number;
  appointmentsIncluded: number;
  tagline: string | null;
  active: boolean;
}

export interface PlanFeature {
  id: string;
  planCode: PlanCode;
  featureKey: FeatureKey | string;
  enabled: boolean;
  limitValue: number | null;
  teaserCopy: string | null;
  upgradeTarget: PlanCode | null;
}

export interface FeatureAccess {
  allowed: boolean;
  limit: number | null;
  unlimited: boolean;
  teaser: string | null;
  upgradeTarget: PlanCode | null;
  currentPlan: PlanCode;
}
