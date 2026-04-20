/**
 * UNPRO — Dynamic Plan Catalog Hook
 * Fetches plan data from plan_catalog table (single source of truth).
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type BillingInterval = "month" | "year";

export type BillingMode = "subscription" | "one_time";

export interface CatalogPlan {
  id: string;
  code: string;
  name: string;
  monthlyPrice: number; // cents CAD
  yearlyPrice: number; // cents CAD (annual total)
  oneTimePrice: number; // cents CAD (for one-time plans like Founder)
  billingMode: BillingMode;
  stripeMonthlyPriceId: string;
  stripeYearlyPriceId: string;
  tagline: string;
  features: string[];
  appointmentsIncluded: number;
  appointmentsRangeMin: number;
  appointmentsRangeMax: number;
  projectSizes: string[];
  appointmentNotes: string[];
  highlighted: boolean;
  priorityLevel: number;
  matchingBoost: number;
  badgeText: string;
  shortPitch: string;
  positionRank: number;
}

async function fetchPlanCatalog(): Promise<CatalogPlan[]> {
  const { data, error } = await supabase
    .from("plan_catalog")
    .select("*")
    .eq("active", true)
    .order("position_rank", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    monthlyPrice: row.monthly_price ?? 0,
    yearlyPrice: row.annual_price ?? 0,
    oneTimePrice: row.one_time_price ?? 0,
    billingMode: (row.billing_mode ?? "subscription") as BillingMode,
    stripeMonthlyPriceId: row.stripe_monthly_price_id ?? "",
    stripeYearlyPriceId: row.stripe_yearly_price_id ?? "",
    tagline: row.tagline ?? row.short_pitch ?? "",
    features: Array.isArray(row.features_json) ? row.features_json : [],
    appointmentsIncluded: row.appointments_included ?? 0,
    appointmentsRangeMin: row.appointments_range_min ?? 0,
    appointmentsRangeMax: row.appointments_range_max ?? 0,
    projectSizes: Array.isArray(row.project_sizes) ? row.project_sizes : [],
    appointmentNotes: Array.isArray(row.appointment_notes) ? row.appointment_notes : [],
    highlighted: row.highlighted ?? false,
    priorityLevel: row.priority_level ?? 1,
    matchingBoost: row.matching_boost ?? 0,
    badgeText: row.badge_text ?? "",
    shortPitch: row.short_pitch ?? "",
    positionRank: row.position_rank ?? 0,
  }));
}

export function usePlanCatalog() {
  return useQuery({
    queryKey: ["plan-catalog"],
    queryFn: fetchPlanCatalog,
    staleTime: 5 * 60 * 1000,
  });
}

export function usePlanByCode(code: string | null | undefined) {
  const { data: plans, ...rest } = usePlanCatalog();
  const plan = plans?.find((p) => p.code === code) ?? null;
  return { plan, plans, ...rest };
}

/** Format cents to display string */
export const formatPlanPrice = (cents: number): string =>
  `${(cents / 100).toFixed(0)} $`;

/** Yearly savings percentage compared to 12× monthly */
export const getYearlySavingsPercent = (plan: CatalogPlan): number => {
  const fullYearly = plan.monthlyPrice * 12;
  if (fullYearly === 0) return 0;
  return Math.round(((fullYearly - plan.yearlyPrice) / fullYearly) * 100);
};

/** Monthly equivalent when billed yearly */
export const getMonthlyEquivalent = (plan: CatalogPlan): string =>
  `${((plan.yearlyPrice / 12) / 100).toFixed(0)} $`;

/** Get the correct Stripe price ID for a plan + interval */
export const getStripePriceId = (
  plan: CatalogPlan,
  interval: BillingInterval
): string =>
  interval === "year" ? plan.stripeYearlyPriceId : plan.stripeMonthlyPriceId;
