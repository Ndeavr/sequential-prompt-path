/**
 * UNPRO — useFeatureAccess
 * Returns access details for a given feature key based on the current contractor's plan.
 */
import { useMemo } from "react";
import { usePlanMatrix, findFeature } from "./usePlanMatrix";
import { useContractorPlan } from "@/hooks/useContractorPlan";
import type { FeatureAccess, FeatureKey, PlanCode } from "./types";

export function useFeatureAccess(featureKey: FeatureKey | string): FeatureAccess {
  const { data } = usePlanMatrix();
  const { planCode } = useContractorPlan();

  return useMemo(() => {
    const features = data?.features ?? [];
    const f = findFeature(features, planCode, featureKey);
    const limit = f?.limitValue ?? null;
    return {
      allowed: f?.enabled ?? false,
      limit,
      unlimited: limit === -1 || limit === null,
      teaser: f?.teaserCopy ?? null,
      upgradeTarget: (f?.upgradeTarget as PlanCode | null) ?? null,
      currentPlan: planCode as PlanCode,
    };
  }, [data, planCode, featureKey]);
}
