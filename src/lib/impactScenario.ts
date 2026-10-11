import type { ImpactSnapshot } from "@/hooks/useImpactSnapshot";

/** Explicit per-journey assumptions only. Never extrapolate an industry total. */
export function impactScenario(data: ImpactSnapshot | null) {
  if (!data?.assumptions?.trim()) return null;
  const homeowner = data.homeowner_hours_per_match;
  const contractor = data.contractor_hours_per_match;
  if (![homeowner, contractor, homeowner + contractor].every(n => typeof n === "number" && Number.isFinite(n) && n >= 0)) return null;
  return { homeowner, contractor, total: homeowner + contractor, assumptions: data.assumptions };
}

export const IMPACT_ANIMATION_MS = 2000;
export function impactAnimationProgress(elapsed: number) {
  const t = Math.min(1, Math.max(0, elapsed / IMPACT_ANIMATION_MS));
  return 1 - Math.pow(1 - t, 3);
}