/**
 * UNPRO — Plan Matrix Hook
 * Fetches the canonical `plans` + `plan_features` matrix.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Plan, PlanFeature, PlanCode } from "./types";

async function fetchPlans(): Promise<Plan[]> {
  const { data, error } = await supabase
    .from("plans" as any)
    .select("*")
    .eq("active", true)
    .order("tier_rank", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    id: r.id,
    code: r.code,
    name: r.name,
    tierRank: r.tier_rank,
    monthlyPrice: r.monthly_price,
    yearlyPrice: r.yearly_price,
    oneTimePrice: r.one_time_price,
    visibilityMultiplier: Number(r.visibility_multiplier),
    recommendationMultiplier: Number(r.recommendation_multiplier),
    aiIndexPriority: r.ai_index_priority,
    trustBoost: Number(r.trust_boost),
    seoBoost: Number(r.seo_boost),
    citationBoost: Number(r.citation_boost),
    territoryRadiusKm: r.territory_radius_km,
    bookingPriority: r.booking_priority,
    appointmentsIncluded: r.appointments_included,
    tagline: r.tagline,
    active: r.active,
  }));
}

async function fetchPlanFeatures(): Promise<PlanFeature[]> {
  const { data, error } = await supabase.from("plan_features" as any).select("*");
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    id: r.id,
    planCode: r.plan_code,
    featureKey: r.feature_key,
    enabled: r.enabled,
    limitValue: r.limit_value,
    teaserCopy: r.teaser_copy,
    upgradeTarget: r.upgrade_target,
  }));
}

export function usePlanMatrix() {
  return useQuery({
    queryKey: ["plan-matrix"],
    queryFn: async () => {
      const [plans, features] = await Promise.all([fetchPlans(), fetchPlanFeatures()]);
      return { plans, features };
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function findPlan(plans: Plan[], code: PlanCode | string): Plan | undefined {
  return plans.find((p) => p.code === code);
}

export function findFeature(
  features: PlanFeature[],
  planCode: PlanCode | string,
  featureKey: string,
): PlanFeature | undefined {
  return features.find((f) => f.planCode === planCode && f.featureKey === featureKey);
}
