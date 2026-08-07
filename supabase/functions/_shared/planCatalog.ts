/**
 * UNPRO — CANONICAL PLAN CATALOG (edge runtime)
 * =============================================
 * PROTECTED FILE. This is the ONLY place an Edge Function may resolve a plan
 * price, name or Stripe price ID from.
 *
 * Source of truth: `public.plans` (audience = 'contractor' | 'homeowner').
 * Legacy aliases (recrue, elite, signature) are resolved through the DB
 * function `public.canonical_plan_code`.
 *
 * HARD RULES
 *  1. NEVER hardcode a price in an Edge Function. Import `resolvePlan` instead.
 *  2. NEVER fall back to an inline `price_data` amount for a recurring plan.
 *     A missing Stripe price ID is a configuration failure that must surface
 *     as an error, not as a silent charge at a stale amount. (This is exactly
 *     how the "UI shows $299 / Stripe charges $349" defect happened.)
 *  3. The webhook interprets `metadata.plan_code` as the CANONICAL code.
 */

export interface CanonicalPlan {
  /** Canonical code, e.g. "pro". Legacy input codes are already resolved. */
  code: string;
  /** Code exactly as the caller supplied it (for logging/attribution). */
  requestedCode: string;
  name: string;
  /** Monthly price in cents CAD. */
  monthlyPrice: number;
  /** Annual total in cents CAD. */
  yearlyPrice: number;
  /** One-time price in cents CAD (0 when the plan is subscription-only). */
  oneTimePrice: number;
  recurring: boolean;
  stripeMonthlyPriceId: string | null;
  stripeYearlyPriceId: string | null;
  tierRank: number;
  audience: string;
}

export class PlanResolutionError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly httpStatus = 400,
  ) {
    super(message);
    this.name = "PlanResolutionError";
  }
}

/** Legacy → canonical, mirrors `public.canonical_plan_code`. */
const LEGACY_ALIASES: Record<string, string> = {
  recrue: "presence",
  elite: "premium",
  "élite": "premium",
  signature: "domination",
};

export function canonicalPlanCode(input: string | null | undefined): string {
  const c = String(input ?? "").trim().toLowerCase();
  return LEGACY_ALIASES[c] ?? c;
}

type SupabaseLike = {
  from: (table: string) => any;
};

/**
 * Resolve a plan code (canonical or legacy) against `public.plans`.
 * Throws PlanResolutionError when the plan is unknown or inactive.
 */
export async function resolvePlan(
  sb: SupabaseLike,
  requestedCode: string | null | undefined,
  opts: { audience?: string; interval?: "month" | "year" } = {},
): Promise<CanonicalPlan> {
  const audience = opts.audience ?? "contractor";
  const requested = String(requestedCode ?? "").trim().toLowerCase();
  if (!requested) {
    throw new PlanResolutionError("Aucun plan spécifié.", "plan_code_missing");
  }
  const code = canonicalPlanCode(requested);

  const { data, error } = await sb
    .from("plans")
    .select(
      "code, name, monthly_price, yearly_price, one_time_price, active, tier_rank, audience, stripe_monthly_price_id, stripe_yearly_price_id",
    )
    .eq("code", code)
    .eq("audience", audience)
    .maybeSingle();

  if (error) {
    throw new PlanResolutionError(
      `Lecture du catalogue impossible: ${error.message}`,
      "plan_catalog_unavailable",
      503,
    );
  }
  if (!data) {
    throw new PlanResolutionError(`Plan inconnu : ${requested}`, "plan_unknown");
  }
  if (data.active === false) {
    throw new PlanResolutionError(
      `Le plan « ${data.name} » n'est plus offert.`,
      "plan_inactive",
      409,
    );
  }

  const oneTime = data.one_time_price ?? 0;
  const monthly = data.monthly_price ?? 0;

  return {
    code: data.code,
    requestedCode: requested,
    name: data.name,
    monthlyPrice: monthly,
    yearlyPrice: data.yearly_price && data.yearly_price > 0 ? data.yearly_price : monthly * 10,
    oneTimePrice: oneTime,
    recurring: monthly > 0,
    stripeMonthlyPriceId: data.stripe_monthly_price_id || null,
    stripeYearlyPriceId: data.stripe_yearly_price_id || null,
    tierRank: data.tier_rank ?? 0,
    audience: data.audience,
  };
}

/**
 * Build the Stripe line item for a plan. Refuses to guess an amount.
 * `interval` defaults to monthly.
 */
export function planLineItem(
  plan: CanonicalPlan,
  interval: "month" | "year" = "month",
): { price: string; quantity: number } {
  const priceId = interval === "year" ? plan.stripeYearlyPriceId : plan.stripeMonthlyPriceId;
  if (!priceId) {
    throw new PlanResolutionError(
      `Le plan « ${plan.name} » n'a pas de tarif Stripe configuré (${interval}). ` +
        `Configurez plans.stripe_${interval === "year" ? "yearly" : "monthly"}_price_id avant d'encaisser.`,
      "stripe_price_missing",
      409,
    );
  }
  return { price: priceId, quantity: 1 };
}

/** Canonical metadata every checkout session must carry for webhook interpretation. */
export function planMetadata(plan: CanonicalPlan, extra: Record<string, string> = {}) {
  return {
    plan_code: plan.code,
    plan_code_requested: plan.requestedCode,
    plan_name: plan.name,
    plan_amount_cents: String(plan.monthlyPrice),
    plan_catalog_version: "plans@v2",
    ...extra,
  };
}

/** Uniform error response helper. */
export function planErrorResponse(e: unknown, corsHeaders: Record<string, string>) {
  const isPlanErr = e instanceof PlanResolutionError;
  const status = isPlanErr ? e.httpStatus : 500;
  const body = {
    error: e instanceof Error ? e.message : String(e),
    error_code: isPlanErr ? e.code : "unexpected_error",
  };
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
