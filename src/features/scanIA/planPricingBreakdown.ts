/**
 * Plan pricing breakdown for QC (GST 5% + QST 9.975%).
 * Dollars in, dollars out. Used to show post-trial renewal amount transparently.
 */
import { CONTRACTOR_PLANS, type ContractorPlanSlug } from "@/config/contractorPlans";

const GST_RATE = 0.05;
const QST_RATE = 0.09975;

export interface PlanPricingBreakdown {
  slug: ContractorPlanSlug;
  name: string;
  subtotal: number; // $
  gst: number;
  qst: number;
  total: number;
}

export function getPlanPricingBreakdown(slug: ContractorPlanSlug): PlanPricingBreakdown | null {
  const plan = CONTRACTOR_PLANS.find((p) => p.slug === slug);
  if (!plan) return null;
  const subtotal = plan.monthlyPrice;
  const gst = Math.round(subtotal * GST_RATE * 100) / 100;
  const qst = Math.round(subtotal * QST_RATE * 100) / 100;
  const total = Math.round((subtotal + gst + qst) * 100) / 100;
  return { slug, name: plan.name, subtotal, gst, qst, total };
}

export function fmtCADDollars(v: number): string {
  const isRound = v === Math.floor(v);
  return isRound
    ? `${Math.floor(v).toLocaleString("fr-CA")} $`
    : `${v.toLocaleString("fr-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $`;
}
