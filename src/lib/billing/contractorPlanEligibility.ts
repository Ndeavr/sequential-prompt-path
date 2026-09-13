/**
 * UNPRO — Shared contractor plan eligibility (single source of truth for the UI).
 *
 * The server (`create-checkout-session`) stays authoritative: it revalidates the
 * quote ownership, the allowed plan, the active Stripe price, promotions, free
 * entitlements, the existing subscription and idempotency. This module only
 * decides WHAT the contractor may see, so that no unselectable option and no
 * dead-end "S'abonner" button is ever rendered.
 *
 * Reuses existing systems only:
 *  - `contractor_pricing_quotes` (personalized quote engine / compute-pricing-quote)
 *  - `plans` catalog via `usePlanCatalog`
 *  - `contractor_subscriptions` via `useContractorSubscription`
 *  - `create-checkout-session` edge function for Stripe
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePlanCatalog, type BillingInterval, type CatalogPlan } from "@/hooks/usePlanCatalog";
import { useContractorSubscription } from "@/hooks/useSubscription";

export const PERSONALIZED_PLAN_HEADING =
  "Obtenez un plan de croissance personnalisé selon vos objectifs.";
export const PERSONALIZED_PLAN_CTA = "Personnaliser mon plan";
export const PERSONALIZED_PLAN_ROUTE = "/entrepreneur/devis-personnalise";

/** Quote statuses that can still lead to an activation/checkout. */
const SELECTABLE_QUOTE_STATUSES = new Set(["draft", "offered", "accepted"]);

export interface EligibilityQuote {
  id: string;
  user_id: string | null;
  recommended_plan: string | null;
  pricing_status: string | null;
  pricing_mode: string | null;
  expires_at: string | null;
  created_at: string | null;
}

export type ContractorPlanEligibility =
  | {
      mode: "standard";
      /** The only plan code the contractor may actually check out. */
      allowedPlanCode: string;
      quoteId: string;
      reason: "valid_quote";
    }
  | {
      mode: "custom_only";
      reason:
        | "no_quote"
        | "quote_expired"
        | "quote_not_selectable"
        | "plan_unavailable"
        | "price_not_configured";
    };

/** Pure resolver — unit tested, no I/O. */
export function resolvePlanEligibility(args: {
  quote: EligibilityQuote | null;
  plans: CatalogPlan[];
  interval: BillingInterval;
  now?: number;
}): ContractorPlanEligibility {
  const { quote, plans, interval } = args;
  const now = args.now ?? Date.now();

  if (!quote) return { mode: "custom_only", reason: "no_quote" };
  if (quote.pricing_mode === "pack") {
    return { mode: "custom_only", reason: "quote_not_selectable" };
  }
  if (quote.expires_at && new Date(quote.expires_at).getTime() <= now) {
    return { mode: "custom_only", reason: "quote_expired" };
  }
  if (!quote.pricing_status || !SELECTABLE_QUOTE_STATUSES.has(quote.pricing_status)) {
    return { mode: "custom_only", reason: "quote_not_selectable" };
  }

  const code = (quote.recommended_plan ?? "").trim();
  if (!code) return { mode: "custom_only", reason: "plan_unavailable" };

  const plan = plans.find((p) => p.code === code);
  if (!plan) return { mode: "custom_only", reason: "plan_unavailable" };

  // A personalized quote overrides the amount, but the plan must still exist as
  // an active, billable subscription plan in the catalog.
  if (plan.billingMode !== "subscription") {
    return { mode: "custom_only", reason: "plan_unavailable" };
  }
  if (interval === "year" && !plan.supportsYearly && !plan.stripeMonthlyPriceId) {
    return { mode: "custom_only", reason: "price_not_configured" };
  }
  if (interval === "month" && !plan.stripeMonthlyPriceId) {
    return { mode: "custom_only", reason: "price_not_configured" };
  }

  return { mode: "standard", allowedPlanCode: plan.code, quoteId: quote.id, reason: "valid_quote" };
}

/** Latest personalized quote owned by the signed-in contractor (RLS enforced). */
export function useLatestPricingQuote() {
  return useQuery({
    queryKey: ["contractor-latest-pricing-quote"],
    queryFn: async (): Promise<EligibilityQuote | null> => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id;
      if (!uid) return null;
      const { data, error } = await supabase
        .from("contractor_pricing_quotes" as never)
        .select("id, user_id, recommended_plan, pricing_status, pricing_mode, expires_at, created_at")
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as EligibilityQuote) ?? null;
    },
    staleTime: 60_000,
  });
}

export function useContractorPlanEligibility(interval: BillingInterval) {
  const { data: plans, isLoading: plansLoading } = usePlanCatalog();
  const { data: quote, isLoading: quoteLoading } = useLatestPricingQuote();
  const { data: subscription, isLoading: subLoading } = useContractorSubscription();

  const isLoading = plansLoading || quoteLoading || subLoading;
  const eligibility = isLoading
    ? null
    : resolvePlanEligibility({ quote: quote ?? null, plans: plans ?? [], interval });

  const hasActiveSubscription =
    !!subscription && ["active", "trialing"].includes(subscription.status);

  return { eligibility, isLoading, subscription, hasActiveSubscription, plans: plans ?? [] };
}

/**
 * Starts the canonical Stripe checkout. The quote id is mandatory here because
 * the server refuses any contractor subscription without a validated
 * personalized quote — the UI must never offer a path that cannot complete.
 */
export async function startContractorPlanCheckout(args: {
  planCode: string;
  billingInterval: BillingInterval;
  quoteId: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ url: string }> {
  const { data, error } = await supabase.functions.invoke("create-checkout-session", {
    body: {
      planId: args.planCode,
      billingInterval: args.billingInterval,
      quoteId: args.quoteId,
      successUrl: args.successUrl,
      cancelUrl: args.cancelUrl,
    },
  });
  if (error) throw new Error(error.message || "Le paiement n'a pas pu démarrer.");
  const url = (data as { url?: string } | null)?.url;
  if (!url) throw new Error("Le paiement n'a pas pu démarrer.");
  return { url };
}
