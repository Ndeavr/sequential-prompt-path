/**
 * UNPRO — Dynamic Plan Catalog Hook
 * Reads the canonical contractor catalog from `plans` (audience = 'contractor').
 * `plans` is the ONLY source of truth for prices and Stripe price IDs.
 * Marketing copy (features, pitch) comes from src/config/contractorPlans.ts.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CONTRACTOR_PLANS } from "@/config/contractorPlans";

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
    .from("plans")
    .select("*")
    .eq("audience", "contractor")
    .eq("active", true)
    .order("tier_rank", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row: any) => {
    const copy = CONTRACTOR_PLANS.find((p) => p.slug === row.code);
    const monthly = row.monthly_price ?? 0;
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      monthlyPrice: monthly,
      // Yearly = 10 months when not explicitly priced (2 months offered).
      yearlyPrice: row.yearly_price && row.yearly_price > 0 ? row.yearly_price : monthly * 10,
      oneTimePrice: row.one_time_price ?? 0,
      billingMode: (row.billing_interval === "one_time"
        ? "one_time"
        : "subscription") as BillingMode,
      stripeMonthlyPriceId: row.stripe_monthly_price_id ?? "",
      stripeYearlyPriceId: row.stripe_yearly_price_id ?? "",
      tagline: row.tagline ?? copy?.subtitle ?? "",
      features: copy?.features ?? [],
      appointmentsIncluded: row.appointments_included ?? copy?.appointmentsIncluded ?? 0,
      appointmentsRangeMin: row.appointments_included ?? 0,
      appointmentsRangeMax: row.appointments_included ?? 0,
      projectSizes: [],
      appointmentNotes: [],
      highlighted: !!copy?.featured,
      priorityLevel: row.booking_priority ?? 1,
      matchingBoost: Number(row.recommendation_multiplier ?? 0),
      badgeText: copy?.eyebrow ?? "",
      shortPitch: copy?.description ?? row.tagline ?? "",
      positionRank: row.tier_rank ?? 0,
    };
  });
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

/** Format cents to display string (fr-CA, e.g. "1 300 $"). */
import { formatPriceCents } from "@/lib/formatPrice";
export const formatPlanPrice = (cents: number): string => formatPriceCents(cents);

/** Yearly savings percentage compared to 12× monthly */
export const getYearlySavingsPercent = (plan: CatalogPlan): number => {
  const fullYearly = plan.monthlyPrice * 12;
  if (fullYearly === 0) return 0;
  return Math.round(((fullYearly - plan.yearlyPrice) / fullYearly) * 100);
};

/** Monthly equivalent when billed yearly */
export const getMonthlyEquivalent = (plan: CatalogPlan): string =>
  formatPriceCents(plan.yearlyPrice / 12);

/** Get the correct Stripe price ID for a plan + interval */
export const getStripePriceId = (
  plan: CatalogPlan,
  interval: BillingInterval
): string =>
  interval === "year" ? plan.stripeYearlyPriceId : plan.stripeMonthlyPriceId;
