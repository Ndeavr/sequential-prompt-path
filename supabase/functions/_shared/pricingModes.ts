// UNPRO — Bidirectional pricing resolution (goal ⇄ budget).
//
// SINGLE canonical formula. This module never re-implements pricing: it is
// given a `priceForTarget` function produced by compute-pricing-quote (the one
// and only engine) and resolves it in the requested direction.
//
//   mode "goal"   → desired appointments in, monthly budget out
//   mode "budget" → monthly budget in, guaranteed appointments out
//
// Margin protection: a guarantee is only issued when the resulting monthly
// revenue keeps the configured minimum margin against the real cost of
// delivering those appointments.

export type PricingMode = "goal" | "budget" | "pack";

export type ModeOutcome =
  | "goal_resolved"
  | "budget_resolved"
  | "budget_below_floor"
  | "capacity_limited"
  | "contractor_capacity_limited"
  | "market_unavailable"
  | "pack_resolved"
  | "pack_capped"
  | "analysis_required";

/** Entry pack — one-time payment, publicly announced as "jusqu'à 5". */
export const PACK_350_TOTAL_CENTS = 35000;
export const PACK_350_MAX_APPOINTMENTS = 5;
export const PACK_350_DURATION_MONTHS = 6;


export interface MarginConfig {
  /** Cost of producing/acquiring ONE appointment (cents). */
  appointment_delivery_cost_cents: number;
  /** Communication cost per appointment (cents). */
  communication_cost_cents_per_appointment: number;
  /** Fixed monthly operational cost per active contractor (cents). */
  operational_cost_cents_monthly: number;
  /** Below this ratio a guarantee is refused. */
  min_margin_ratio: number;
  target_margin_ratio: number;
}

export const DEFAULT_MARGIN_CONFIG: MarginConfig = {
  appointment_delivery_cost_cents: 2500,
  communication_cost_cents_per_appointment: 400,
  operational_cost_cents_monthly: 1500,
  min_margin_ratio: 0.35,
  target_margin_ratio: 0.55,
};

export function marginConfigFrom(weights: Record<string, unknown> | null | undefined): MarginConfig {
  const w = (weights ?? {}) as Record<string, unknown>;
  const num = (k: keyof MarginConfig) => {
    const v = Number(w[k as string]);
    return Number.isFinite(v) && v >= 0 ? v : DEFAULT_MARGIN_CONFIG[k];
  };
  return {
    appointment_delivery_cost_cents: num("appointment_delivery_cost_cents"),
    communication_cost_cents_per_appointment: num("communication_cost_cents_per_appointment"),
    operational_cost_cents_monthly: num("operational_cost_cents_monthly"),
    min_margin_ratio: num("min_margin_ratio"),
    target_margin_ratio: num("target_margin_ratio"),
  };
}

export interface MarginEvaluation {
  revenue_cents: number;
  cost_cents: number;
  margin_cents: number;
  margin_ratio: number;
  meets_minimum: boolean;
  meets_target: boolean;
}

export function evaluateMargin(
  monthlyPriceCents: number,
  appointments: number,
  cfg: MarginConfig,
): MarginEvaluation {
  const appts = Math.max(0, appointments);
  const cost =
    appts * (cfg.appointment_delivery_cost_cents + cfg.communication_cost_cents_per_appointment) +
    cfg.operational_cost_cents_monthly;
  const revenue = Math.max(0, monthlyPriceCents);
  const margin = revenue - cost;
  const ratio = revenue > 0 ? margin / revenue : 0;
  return {
    revenue_cents: revenue,
    cost_cents: cost,
    margin_cents: margin,
    margin_ratio: Math.round(ratio * 1000) / 1000,
    meets_minimum: revenue > 0 && ratio >= cfg.min_margin_ratio,
    meets_target: revenue > 0 && ratio >= cfg.target_margin_ratio,
  };
}

/** What the caller's canonical price chain returns for a given appointment target. */
export interface PricedTarget {
  target: number;
  plan_code: string;
  monthly_price_cents: number;
  capacity_capped: boolean;
}

export interface BudgetSolveInput {
  monthly_budget_cents: number;
  /** Real appointments the market can still deliver, or null when unknown. */
  market_ceiling: number | null;
  /** Appointments the contractor declared being able to absorb. */
  contractor_capacity: number;
  /** Market has no remaining position / is saturated. */
  market_unavailable: boolean;
  margin: MarginConfig;
  /** Hard search bound (defensive). */
  max_search?: number;
}

export interface BudgetSolveResult {
  guaranteed_appointments: number;
  priced: PricedTarget | null;
  outcome: ModeOutcome;
  /** Appointments the budget alone could have afforded, before capacity caps. */
  budget_affordable_appointments: number;
  market_ceiling: number | null;
  contractor_capacity: number;
  margin: MarginEvaluation | null;
  /** Budget that is not justified by real capacity (cents, ≥ 0). */
  unused_budget_cents: number;
  evaluated: PricedTarget[];
}

/**
 * Resolve "how many appointments can UNPRO really guarantee for this budget?"
 *
 * The answer is the LARGEST appointment count N such that:
 *   - the canonical price for N ≤ budget,
 *   - N ≤ real market ceiling,
 *   - N ≤ contractor declared capacity,
 *   - the resulting margin ≥ configured minimum.
 *
 * The price returned is the REAL canonical price of N — never the budget.
 */
export function solveBudget(
  input: BudgetSolveInput,
  priceForTarget: (target: number) => PricedTarget,
): BudgetSolveResult {
  const budget = Math.max(0, Math.round(input.monthly_budget_cents));
  const contractorCap = Math.max(0, Math.round(input.contractor_capacity || 0));
  const marketCeiling =
    input.market_ceiling === null || input.market_ceiling === undefined
      ? null
      : Math.max(0, Math.floor(input.market_ceiling));
  const searchMax = Math.max(
    0,
    Math.min(
      input.max_search ?? 60,
      contractorCap > 0 ? contractorCap : (input.max_search ?? 60),
      marketCeiling === null ? (input.max_search ?? 60) : marketCeiling,
    ),
  );

  const evaluated: PricedTarget[] = [];

  if (input.market_unavailable) {
    return {
      guaranteed_appointments: 0,
      priced: null,
      outcome: "market_unavailable",
      budget_affordable_appointments: 0,
      market_ceiling: marketCeiling,
      contractor_capacity: contractorCap,
      margin: null,
      unused_budget_cents: budget,
      evaluated,
    };
  }

  // Budget-only affordability (ignores capacity), used to explain WHY the
  // guarantee stops where it stops.
  let affordable = 0;
  for (let n = 1; n <= (input.max_search ?? 60); n++) {
    const priced = priceForTarget(n);
    if (priced.monthly_price_cents > budget) break;
    if (!evaluateMargin(priced.monthly_price_cents, n, input.margin).meets_minimum) break;
    affordable = n;
  }

  let best: PricedTarget | null = null;
  for (let n = 1; n <= searchMax; n++) {
    const priced = priceForTarget(n);
    evaluated.push(priced);
    if (priced.monthly_price_cents > budget) break;
    if (!evaluateMargin(priced.monthly_price_cents, n, input.margin).meets_minimum) break;
    best = priced;
  }

  if (!best) {
    return {
      guaranteed_appointments: 0,
      priced: null,
      outcome: "budget_below_floor",
      budget_affordable_appointments: affordable,
      market_ceiling: marketCeiling,
      contractor_capacity: contractorCap,
      margin: null,
      unused_budget_cents: budget,
      evaluated,
    };
  }

  const limitedByMarket = marketCeiling !== null && best.target >= marketCeiling && affordable > marketCeiling;
  const limitedByContractor =
    contractorCap > 0 && best.target >= contractorCap && affordable > contractorCap;

  const outcome: ModeOutcome = limitedByContractor
    ? "contractor_capacity_limited"
    : limitedByMarket
      ? "capacity_limited"
      : "budget_resolved";

  return {
    guaranteed_appointments: best.target,
    priced: best,
    outcome,
    budget_affordable_appointments: affordable,
    market_ceiling: marketCeiling,
    contractor_capacity: contractorCap,
    margin: evaluateMargin(best.monthly_price_cents, best.target, input.margin),
    unused_budget_cents: Math.max(0, budget - best.monthly_price_cents),
    evaluated,
  };
}

// ---------------------------------------------------------------------------
// Entry pack (one-time payment) — same canonical chain, new resolution direction
// ---------------------------------------------------------------------------

export interface PackSolveInput {
  /** One-time amount paid by the contractor (cents). */
  total_price_cents: number;
  /** Maximum delivery window for the guaranteed appointments. */
  duration_months: number;
  market_ceiling: number | null;
  contractor_capacity: number;
  market_unavailable: boolean;
  margin: MarginConfig;
  max_search?: number;
}

export interface PackSolveResult extends BudgetSolveResult {
  total_price_cents: number;
  duration_months: number;
  /** Appointments the chain resolved BEFORE the public offer ceiling. */
  resolved_before_cap: number;
  /** True when the 350 $ public ceiling reduced the guarantee. */
  capped_by_offer: boolean;
  offer_max_appointments: number | null;
}

/**
 * Resolve "how many exclusive appointments can UNPRO really guarantee for this
 * one-time amount?".
 *
 * Identical resolution to `solveBudget` (same canonical price chain), plus:
 *   - a hard public ceiling of 5 appointments for the 350 $ entry pack,
 *   - no invented guarantee when the market ceiling is unknown or closed.
 *
 * No rule of three: amounts above the entry pack are resolved purely by the
 * market chain, with no ceiling applied.
 */
export function solvePack(
  input: PackSolveInput,
  priceForTarget: (target: number) => PricedTarget,
): PackSolveResult {
  const total = Math.max(0, Math.round(input.total_price_cents));
  const duration = Math.max(1, Math.round(input.duration_months || PACK_350_DURATION_MONTHS));
  const offerMax = total <= PACK_350_TOTAL_CENTS ? PACK_350_MAX_APPOINTMENTS : null;

  const base = solveBudget(
    {
      monthly_budget_cents: total,
      market_ceiling: input.market_ceiling,
      contractor_capacity: input.contractor_capacity,
      market_unavailable: input.market_unavailable,
      margin: input.margin,
      max_search: input.max_search,
    },
    priceForTarget,
  );

  // Never invent a guarantee on a territory we cannot measure.
  if (input.market_unavailable || input.market_ceiling === null) {
    return {
      ...base,
      guaranteed_appointments: 0,
      priced: null,
      margin: null,
      outcome: "analysis_required",
      total_price_cents: total,
      duration_months: duration,
      resolved_before_cap: base.guaranteed_appointments,
      capped_by_offer: false,
      offer_max_appointments: offerMax,
      unused_budget_cents: total,
    };
  }

  const resolved = base.guaranteed_appointments;
  if (resolved <= 0) {
    return {
      ...base,
      outcome: "budget_below_floor",
      total_price_cents: total,
      duration_months: duration,
      resolved_before_cap: resolved,
      capped_by_offer: false,
      offer_max_appointments: offerMax,
    };
  }

  const capped = offerMax !== null && resolved > offerMax;
  const guaranteed = capped ? offerMax! : resolved;
  const priced = capped ? priceForTarget(guaranteed) : base.priced;

  return {
    ...base,
    guaranteed_appointments: guaranteed,
    priced,
    margin: evaluateMargin(total, guaranteed, input.margin),
    outcome: capped ? "pack_capped" : "pack_resolved",
    total_price_cents: total,
    duration_months: duration,
    resolved_before_cap: resolved,
    capped_by_offer: capped,
    offer_max_appointments: offerMax,
    unused_budget_cents: Math.max(0, total - (priced?.monthly_price_cents ?? 0)),
  };
}
