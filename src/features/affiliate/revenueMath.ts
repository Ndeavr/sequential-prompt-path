/**
 * UNPRO — Affiliate Revenue Math (Module 16)
 * Single source of truth for commission calculations.
 * Pure functions — no side effects, no I/O. Fully unit-testable.
 */
import {
  CONTRACTOR_PLANS,
  PLAN_PRICE_MAP,
  getContractorPlan,
  type ContractorPlan,
  type ContractorPlanSlug,
} from "@/config/contractorPlans";

export const DEFAULT_COMMISSION_RATE = 0.20;
export const DEFAULT_LIFETIME_MONTHS = 24;

export interface CommissionBreakdown {
  slug: ContractorPlanSlug;
  name: string;
  monthlyPrice: number;
  monthlyCommission: number;
  annualCommission: number;
  lifetimeCommission: number;
}

/** Monthly commission = plan price × rate */
export function monthlyCommission(planPrice: number, rate: number): number {
  return round2(planPrice * rate);
}

/** Annual commission = plan price × 12 × rate */
export function annualCommission(planPrice: number, rate: number): number {
  return round2(planPrice * 12 * rate);
}

/** Lifetime commission = plan price × rate × avg lifetime months */
export function lifetimeCommission(
  planPrice: number,
  rate: number,
  lifetimeMonths: number = DEFAULT_LIFETIME_MONTHS,
): number {
  return round2(planPrice * rate * lifetimeMonths);
}

/** Full commission breakdown for a single plan slug */
export function breakdownForPlan(
  slug: ContractorPlanSlug,
  rate: number = DEFAULT_COMMISSION_RATE,
  lifetimeMonths: number = DEFAULT_LIFETIME_MONTHS,
): CommissionBreakdown {
  const plan = getContractorPlan(slug) as ContractorPlan;
  const price = PLAN_PRICE_MAP[slug];
  return {
    slug,
    name: plan?.name ?? slug,
    monthlyPrice: price,
    monthlyCommission: monthlyCommission(price, rate),
    annualCommission: annualCommission(price, rate),
    lifetimeCommission: lifetimeCommission(price, rate, lifetimeMonths),
  };
}

/** Breakdown for every plan (used by the Revenue Opportunity table) */
export function breakdownAllPlans(
  rate: number = DEFAULT_COMMISSION_RATE,
  lifetimeMonths: number = DEFAULT_LIFETIME_MONTHS,
): CommissionBreakdown[] {
  return CONTRACTOR_PLANS.map((p) => breakdownForPlan(p.slug, rate, lifetimeMonths));
}

/** Aggregate potential pipeline commission across many assigned leads */
export interface PipelineTotals {
  count: number;
  potentialMonthly: number;
  potentialAnnual: number;
  potentialLifetime: number;
}

export function aggregatePipeline(
  recommendedPlans: ContractorPlanSlug[],
  rate: number = DEFAULT_COMMISSION_RATE,
  lifetimeMonths: number = DEFAULT_LIFETIME_MONTHS,
): PipelineTotals {
  let monthly = 0;
  for (const slug of recommendedPlans) {
    monthly += (PLAN_PRICE_MAP[slug] ?? 0) * rate;
  }
  return {
    count: recommendedPlans.length,
    potentialMonthly: round2(monthly),
    potentialAnnual: round2(monthly * 12),
    potentialLifetime: round2(monthly * lifetimeMonths),
  };
}

/** ---------------------------------------------------------------- */
/** Rule-based plan recommender (deterministic; AI adds the reason)  */
/** ---------------------------------------------------------------- */

export type DemandLevel = "low" | "medium" | "high";
export type TerritorySize = "small" | "medium" | "large";

export interface RecommenderInputs {
  reviewCount?: number | null;
  unproScore?: number | null;
  demandLevel?: DemandLevel | null;
  territorySize?: TerritorySize | null;
  hasWebsite?: boolean | null;
  hasRbq?: boolean | null;
}

export interface PlanRecommendation {
  slug: ContractorPlanSlug;
  reasons: string[];
}

/**
 * Deterministic rule ladder — high signal wins.
 * Signature: 500+ reviews AND large territory AND high demand
 * Elite:     300+ reviews AND (large OR medium) territory AND high demand
 * Premium:   150+ reviews OR (medium+ territory AND high demand)
 * Pro:       any qualified lead with score ≥ 60
 * Recrue:    everything else
 */
export function recommendPlan(input: RecommenderInputs): PlanRecommendation {
  const reviews = input.reviewCount ?? 0;
  const score = input.unproScore ?? 0;
  const demand = input.demandLevel ?? "medium";
  const territory = input.territorySize ?? "small";
  const reasons: string[] = [];

  if (reviews >= 500 && territory === "large" && demand === "high") {
    reasons.push(`${reviews}+ avis`, "Territoire majeur", "Forte demande");
    return { slug: "signature", reasons };
  }
  if (reviews >= 300 && territory !== "small" && demand === "high") {
    reasons.push(`${reviews}+ avis`, "Multi-villes", "Forte demande");
    return { slug: "elite", reasons };
  }
  if (reviews >= 150 || (territory !== "small" && demand === "high")) {
    if (reviews >= 150) reasons.push(`${reviews}+ avis`);
    if (demand === "high") reasons.push("Forte demande homeowner");
    if (territory !== "small") reasons.push("Bon territoire");
    return { slug: "premium", reasons };
  }
  if (score >= 60 || reviews >= 30) {
    if (reviews > 0) reasons.push(`${reviews} avis`);
    if (score >= 60) reasons.push(`Score ${score}`);
    return { slug: "pro", reasons };
  }
  reasons.push("Profil à consolider");
  return { slug: "recrue", reasons };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
