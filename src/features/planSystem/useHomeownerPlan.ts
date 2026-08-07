/**
 * UNPRO — Homeowner Plan & Entitlements
 * Single authoritative source: `plans` (audience = 'homeowner') + `plan_features`.
 * Never hardcode homeowner limits anywhere else.
 */
import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type HomeownerPlanCode = "home_decouverte" | "home_plus" | "home_signature";

/** Feature keys enforced for homeowners (mirrors plan_features rows). */
export type HomeownerFeatureKey =
  | "properties_max"
  | "quote_analysis_monthly"
  | "quote_comparison"
  | "contractor_verification_detailed"
  | "maintenance_reminders"
  | "document_archive_advanced"
  | "project_history"
  | "alex_priority"
  | "work_prioritization"
  | "proactive_suggestions"
  | "priority_support";

export interface HomeownerPlan {
  code: HomeownerPlanCode;
  name: string;
  tierRank: number;
  yearlyPrice: number; // cents CAD
  tagline: string | null;
  stripeYearlyPriceId: string | null;
}

export interface HomeownerFeatureAccess {
  allowed: boolean;
  limit: number | null;
  unlimited: boolean;
  teaser: string | null;
  upgradeTarget: HomeownerPlanCode | null;
  currentPlan: HomeownerPlanCode;
}

/** Stripe/legacy plan code → canonical catalog code. */
export function normalizeHomeownerPlanCode(code: string | null | undefined): HomeownerPlanCode {
  switch ((code ?? "").toLowerCase()) {
    case "plus":
    case "home_plus":
    case "homeowners_plus":
      return "home_plus";
    case "signature":
    case "home_signature":
    case "homeowners_signature":
      return "home_signature";
    default:
      return "home_decouverte";
  }
}

/** Canonical catalog code → checkout code accepted by `create-homeowner-checkout`. */
export function toCheckoutPlanCode(code: HomeownerPlanCode): "plus" | "signature" | null {
  if (code === "home_plus") return "plus";
  if (code === "home_signature") return "signature";
  return null;
}

const ACTIVE_STATUSES = ["active", "trialing"];

async function fetchHomeownerCatalog() {
  const [{ data: plans, error: planErr }, { data: features, error: featErr }] = await Promise.all([
    supabase
      .from("plans" as any)
      .select("*")
      .eq("audience", "homeowner")
      .eq("active", true)
      .order("tier_rank", { ascending: true }),
    supabase.from("plan_features" as any).select("*").like("plan_code", "home_%"),
  ]);
  if (planErr) throw planErr;
  if (featErr) throw featErr;

  return {
    plans: ((plans ?? []) as any[]).map((r) => ({
      code: r.code as HomeownerPlanCode,
      name: r.name as string,
      tierRank: r.tier_rank as number,
      yearlyPrice: (r.yearly_price ?? 0) as number,
      tagline: (r.tagline ?? null) as string | null,
      stripeYearlyPriceId: (r.stripe_yearly_price_id ?? null) as string | null,
    })) as HomeownerPlan[],
    features: ((features ?? []) as any[]).map((r) => ({
      planCode: r.plan_code as HomeownerPlanCode,
      featureKey: r.feature_key as string,
      enabled: !!r.enabled,
      limitValue: (r.limit_value ?? null) as number | null,
      teaserCopy: (r.teaser_copy ?? null) as string | null,
      upgradeTarget: (r.upgrade_target ?? null) as HomeownerPlanCode | null,
    })),
  };
}

export function useHomeownerPlanCatalog() {
  return useQuery({
    queryKey: ["homeowner-plan-catalog"],
    queryFn: fetchHomeownerCatalog,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Current homeowner subscription state.
 * Refetches on window focus so entitlements refresh right after Stripe redirect.
 */
export function useHomeownerPlan() {
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;
  const catalog = useHomeownerPlanCatalog();

  const subQuery = useQuery({
    queryKey: ["homeowner-subscription", userId],
    enabled: !!userId,
    refetchOnWindowFocus: true,
    staleTime: 15_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("homeowner_subscriptions")
        .select("plan_code, status, current_period_end, cancel_at_period_end, stripe_subscription_id")
        .eq("user_id", userId!)
        .order("updated_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      const active = (data ?? []).find(
        (s) =>
          ACTIVE_STATUSES.includes(s.status) &&
          (!s.current_period_end || new Date(s.current_period_end) > new Date()),
      );
      return active ?? null;
    },
  });

  const sub = subQuery.data ?? null;
  const planCode = normalizeHomeownerPlanCode(sub?.plan_code);
  const plan = catalog.data?.plans.find((p) => p.code === planCode) ?? null;

  const feature = useMemo(() => {
    const features = catalog.data?.features ?? [];
    return (key: HomeownerFeatureKey | string): HomeownerFeatureAccess => {
      const f = features.find((x) => x.planCode === planCode && x.featureKey === key);
      const limit = f?.limitValue ?? null;
      return {
        allowed: f?.enabled ?? false,
        limit,
        unlimited: limit === -1,
        teaser: f?.teaserCopy ?? null,
        upgradeTarget: f?.upgradeTarget ?? null,
        currentPlan: planCode,
      };
    };
  }, [catalog.data, planCode]);

  return {
    planCode,
    plan,
    plans: catalog.data?.plans ?? [],
    isPaid: planCode !== "home_decouverte",
    status: sub?.status ?? null,
    currentPeriodEnd: sub?.current_period_end ?? null,
    cancelAtPeriodEnd: !!sub?.cancel_at_period_end,
    isLoading: catalog.isLoading || (!!userId && subQuery.isLoading),
    feature,
    refetch: subQuery.refetch,
  };
}

/** Access details for one homeowner feature. */
export function useHomeownerFeature(featureKey: HomeownerFeatureKey | string): HomeownerFeatureAccess & {
  isLoading: boolean;
} {
  const { feature, isLoading } = useHomeownerPlan();
  return { ...feature(featureKey), isLoading };
}

/** Invalidate entitlement caches (call after a successful checkout return). */
export function useRefreshEntitlements() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["homeowner-subscription"] });
    qc.invalidateQueries({ queryKey: ["homeowner-plan-catalog"] });
  };
}
