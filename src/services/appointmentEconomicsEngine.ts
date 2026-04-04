/**
 * UNPRO — Appointment Economics Engine
 * Handles included appointments, extra pricing, usage tracking, upgrade logic.
 */
import { supabase } from "@/integrations/supabase/client";

// ── Types ──────────────────────────────────────────────────────────

export type ProjectSizeCode = "xs" | "s" | "m" | "l" | "xl" | "xxl";
export type PlanCode = "recrue" | "pro" | "premium" | "elite" | "signature";
export type QuotaState = "normal" | "warning" | "exceeded" | "blocked";
export type BillingStatus = "pending" | "confirmed" | "invoiced" | "refunded";

export interface ProjectSize {
  id: string;
  code: ProjectSizeCode;
  label: string;
  sort_order: number;
  units_consumed_per_appointment: number;
  capture_factor: number;
  size_multiplier: number;
}

export interface PlanIncludedAppointments {
  id: string;
  plan_code: PlanCode;
  included_appointments_monthly: number;
  included_units_monthly: number;
  base_extra_appointment_price: number;
  can_rollover_unused_appointments: boolean;
  rollover_cap_units: number | null;
}

export interface PlanProjectSizeAccess {
  id: string;
  plan_code: PlanCode;
  project_size_id: string;
  access_allowed: boolean;
  upgrade_target_plan_code: PlanCode | null;
}

export interface ExtraPricingRule {
  plan_code: PlanCode;
  project_size_code: ProjectSizeCode;
  base_extra_price: number;
  size_multiplier: number;
  scarcity_multiplier: number;
  cluster_value_multiplier: number;
  monetization_floor_factor: number;
  computed_final_price: number | null;
}

export interface EntrepreneurUsage {
  id: string;
  contractor_id: string;
  plan_code: PlanCode;
  billing_cycle_start: string;
  billing_cycle_end: string;
  included_appointments_monthly: number;
  included_units_monthly: number;
  consumed_appointments_count: number;
  consumed_units: number;
  remaining_units: number;
  overage_appointments_count: number;
  overage_units: number;
  overage_amount: number;
  upgrade_recommended: boolean;
  upgrade_target_plan: PlanCode | null;
  upgrade_savings_projected: number;
}

export interface MonthlySummary {
  id: string;
  contractor_id: string;
  plan_code: PlanCode;
  billing_month: string;
  included_units: number;
  consumed_units: number;
  extra_units: number;
  included_appointments_count: number;
  extra_appointments_count: number;
  subscription_revenue: number;
  extra_appointment_revenue: number;
  total_revenue: number;
  average_revenue_per_appointment: number;
  average_revenue_per_unit: number;
  upgrade_pressure_score: number;
}

export interface UpgradeBreakEven {
  current_plan: PlanCode;
  next_plan: PlanCode;
  current_price: number;
  next_price: number;
  price_difference: number;
  current_overage: number;
  should_recommend: boolean;
  savings_if_upgrade: number;
  message: string;
}

// ── Constants ──────────────────────────────────────────────────────

export const PLAN_PRICES: Record<PlanCode, number> = {
  recrue: 99,
  pro: 199,
  premium: 399,
  elite: 699,
  signature: 1499,
};

export const PLAN_LABELS: Record<PlanCode, string> = {
  recrue: "Recrue",
  pro: "Pro",
  premium: "Premium",
  elite: "Élite",
  signature: "Signature",
};

export const PLAN_ORDER: PlanCode[] = ["recrue", "pro", "premium", "elite", "signature"];

const SIZE_LABELS: Record<ProjectSizeCode, string> = {
  xs: "XS", s: "S", m: "M", l: "L", xl: "XL", xxl: "XXL",
};

const INCLUDED_APPOINTMENTS: Record<PlanCode, { appointments: number; units: number }> = {
  recrue: { appointments: 4, units: 4.0 },
  pro: { appointments: 8, units: 10.0 },
  premium: { appointments: 15, units: 22.0 },
  elite: { appointments: 25, units: 40.0 },
  signature: { appointments: 40, units: 75.0 },
};

const BASE_EXTRA_PRICES: Record<PlanCode, number> = {
  recrue: 79, pro: 99, premium: 129, elite: 169, signature: 229,
};

const SIZE_UNITS: Record<ProjectSizeCode, number> = {
  xs: 0.50, s: 1.00, m: 1.50, l: 2.00, xl: 3.00, xxl: 5.00,
};

const SIZE_MULTIPLIERS: Record<ProjectSizeCode, number> = {
  xs: 0.70, s: 1.00, m: 1.20, l: 1.50, xl: 2.00, xxl: 3.00,
};

const CAPTURE_FACTORS: Record<ProjectSizeCode, number> = {
  xs: 0.015, s: 0.020, m: 0.030, l: 0.040, xl: 0.055, xxl: 0.075,
};

const SCARCITY_MULTIPLIERS: Record<string, number> = {
  open: 1.00, tight: 1.10, rare: 1.25, full: 1.50, locked: 1.75,
};

const CLUSTER_VALUE_MULTIPLIERS: Record<string, number> = {
  low: 0.90, medium: 1.00, high: 1.15, elite: 1.30,
};

// Plan → accessible sizes
const PLAN_SIZE_ACCESS: Record<PlanCode, ProjectSizeCode[]> = {
  recrue: ["xs", "s"],
  pro: ["xs", "s", "m"],
  premium: ["xs", "s", "m", "l"],
  elite: ["xs", "s", "m", "l", "xl"],
  signature: ["xs", "s", "m", "l", "xl", "xxl"],
};

// ── Core Computation Functions ─────────────────────────────────────

export function getIncludedAppointments(planCode: PlanCode) {
  return INCLUDED_APPOINTMENTS[planCode];
}

export function getUnitsConsumed(sizeCode: ProjectSizeCode): number {
  return SIZE_UNITS[sizeCode];
}

export function isSizeAccessible(planCode: PlanCode, sizeCode: ProjectSizeCode): boolean {
  return PLAN_SIZE_ACCESS[planCode].includes(sizeCode);
}

export function getUpgradeTargetForSize(planCode: PlanCode, sizeCode: ProjectSizeCode): PlanCode | null {
  if (isSizeAccessible(planCode, sizeCode)) return null;
  for (const p of PLAN_ORDER) {
    if (PLAN_ORDER.indexOf(p) > PLAN_ORDER.indexOf(planCode) && PLAN_SIZE_ACCESS[p].includes(sizeCode)) {
      return p;
    }
  }
  return null;
}

export function computeExtraAppointmentPrice(
  planCode: PlanCode,
  sizeCode: ProjectSizeCode,
  scarcityStatus: string = "open",
  clusterValueTier: string = "medium",
  appointmentMarketValue?: number
): number {
  const baseExtra = BASE_EXTRA_PRICES[planCode];
  const sizeMult = SIZE_MULTIPLIERS[sizeCode];
  const scarcityMult = SCARCITY_MULTIPLIERS[scarcityStatus] ?? 1.0;
  const clusterMult = CLUSTER_VALUE_MULTIPLIERS[clusterValueTier] ?? 1.0;
  const monetizationFloor = 0.12;

  const calculated = baseExtra * sizeMult * scarcityMult * clusterMult;
  const marketFloor = (appointmentMarketValue ?? 0) * monetizationFloor;

  return Math.round(Math.max(calculated, marketFloor) * 100) / 100;
}

export function computeQuotaState(
  consumedUnits: number,
  includedUnits: number
): QuotaState {
  if (includedUnits <= 0) return "blocked";
  const ratio = consumedUnits / includedUnits;
  if (ratio >= 1) return "exceeded";
  if (ratio >= 0.80) return "warning";
  return "normal";
}

export function computeOverage(
  consumedUnits: number,
  includedUnits: number
): { overageUnits: number; isOver: boolean } {
  const overageUnits = Math.max(0, consumedUnits - includedUnits);
  return { overageUnits, isOver: overageUnits > 0 };
}

export function computeUpgradeBreakEven(
  currentPlan: PlanCode,
  currentOverageMonthly: number
): UpgradeBreakEven | null {
  const idx = PLAN_ORDER.indexOf(currentPlan);
  if (idx >= PLAN_ORDER.length - 1) return null;

  const nextPlan = PLAN_ORDER[idx + 1];
  const priceDiff = PLAN_PRICES[nextPlan] - PLAN_PRICES[currentPlan];
  const threshold = priceDiff * 0.85;
  const shouldRecommend = currentOverageMonthly >= threshold;
  const savings = currentOverageMonthly - priceDiff;

  let message = "";
  if (shouldRecommend) {
    message = `Vous payez ${currentOverageMonthly.toFixed(0)}$ en extra. Passez ${PLAN_LABELS[nextPlan]} pour ${PLAN_PRICES[nextPlan]}$/mois et économisez ~${Math.max(0, savings).toFixed(0)}$/mois.`;
  }

  return {
    current_plan: currentPlan,
    next_plan: nextPlan,
    current_price: PLAN_PRICES[currentPlan],
    next_price: PLAN_PRICES[nextPlan],
    price_difference: priceDiff,
    current_overage: currentOverageMonthly,
    should_recommend: shouldRecommend,
    savings_if_upgrade: Math.max(0, savings),
    message,
  };
}

// ── Profitability Matrix ───────────────────────────────────────────

export interface PlanProfitabilityRow {
  plan_code: PlanCode;
  plan_label: string;
  monthly_price: number;
  included_appointments: number;
  included_units: number;
  base_extra_price: number;
  accessible_sizes: ProjectSizeCode[];
  // Computed from usage data when available
  avg_extra_appointments?: number;
  avg_overage_amount?: number;
  avg_total_revenue?: number;
  avg_revenue_per_appointment?: number;
  avg_revenue_per_unit?: number;
}

export function buildProfitabilityMatrix(): PlanProfitabilityRow[] {
  return PLAN_ORDER.map(code => ({
    plan_code: code,
    plan_label: PLAN_LABELS[code],
    monthly_price: PLAN_PRICES[code],
    included_appointments: INCLUDED_APPOINTMENTS[code].appointments,
    included_units: INCLUDED_APPOINTMENTS[code].units,
    base_extra_price: BASE_EXTRA_PRICES[code],
    accessible_sizes: PLAN_SIZE_ACCESS[code],
  }));
}

// ── Extra Pricing Matrix ───────────────────────────────────────────

export interface ExtraPricingMatrixRow {
  plan_code: PlanCode;
  plan_label: string;
  size_code: ProjectSizeCode;
  size_label: string;
  access_allowed: boolean;
  base_extra_price: number;
  size_multiplier: number;
  scarcity_multiplier: number;
  cluster_value_multiplier: number;
  final_price: number;
  upgrade_target: PlanCode | null;
}

export function buildExtraPricingMatrix(
  scarcityStatus: string = "open",
  clusterValueTier: string = "medium"
): ExtraPricingMatrixRow[] {
  const rows: ExtraPricingMatrixRow[] = [];
  const sizes: ProjectSizeCode[] = ["xs", "s", "m", "l", "xl", "xxl"];

  for (const plan of PLAN_ORDER) {
    for (const size of sizes) {
      const accessible = isSizeAccessible(plan, size);
      const finalPrice = computeExtraAppointmentPrice(plan, size, scarcityStatus, clusterValueTier);
      rows.push({
        plan_code: plan,
        plan_label: PLAN_LABELS[plan],
        size_code: size,
        size_label: SIZE_LABELS[size],
        access_allowed: accessible,
        base_extra_price: BASE_EXTRA_PRICES[plan],
        size_multiplier: SIZE_MULTIPLIERS[size],
        scarcity_multiplier: SCARCITY_MULTIPLIERS[scarcityStatus] ?? 1.0,
        cluster_value_multiplier: CLUSTER_VALUE_MULTIPLIERS[clusterValueTier] ?? 1.0,
        final_price: finalPrice,
        upgrade_target: getUpgradeTargetForSize(plan, size),
      });
    }
  }

  return rows;
}

// ── Usage Simulation ───────────────────────────────────────────────

export interface UsageSimulation {
  plan_code: PlanCode;
  appointments: { size: ProjectSizeCode; count: number }[];
  total_appointments: number;
  total_units_consumed: number;
  included_units: number;
  remaining_units: number;
  overage_units: number;
  extra_appointments_count: number;
  extra_cost: number;
  quota_state: QuotaState;
  upgrade?: UpgradeBreakEven | null;
}

export function simulateMonthlyUsage(
  planCode: PlanCode,
  appointments: { size: ProjectSizeCode; count: number }[],
  scarcityStatus: string = "open",
  clusterValueTier: string = "medium"
): UsageSimulation {
  const included = INCLUDED_APPOINTMENTS[planCode];
  let totalUnits = 0;
  let totalAppts = 0;
  let extraCost = 0;
  let extraCount = 0;

  // Process each appointment, consuming from quota first
  for (const { size, count } of appointments) {
    if (!isSizeAccessible(planCode, size)) continue;
    const unitsPer = SIZE_UNITS[size];
    for (let i = 0; i < count; i++) {
      totalAppts++;
      totalUnits += unitsPer;
      if (totalUnits > included.units) {
        // This is an extra appointment
        extraCount++;
        extraCost += computeExtraAppointmentPrice(planCode, size, scarcityStatus, clusterValueTier);
      }
    }
  }

  const remaining = Math.max(0, included.units - totalUnits);
  const overage = Math.max(0, totalUnits - included.units);
  const quotaState = computeQuotaState(totalUnits, included.units);
  const upgrade = computeUpgradeBreakEven(planCode, extraCost);

  return {
    plan_code: planCode,
    appointments,
    total_appointments: totalAppts,
    total_units_consumed: totalUnits,
    included_units: included.units,
    remaining_units: remaining,
    overage_units: overage,
    extra_appointments_count: extraCount,
    extra_cost: Math.round(extraCost * 100) / 100,
    quota_state: quotaState,
    upgrade,
  };
}

// ── Data Access ────────────────────────────────────────────────────

export async function loadProjectSizes(): Promise<ProjectSize[]> {
  const { data, error } = await supabase
    .from("project_sizes")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");
  if (error) throw error;
  return (data || []) as ProjectSize[];
}

export async function loadPlanIncludedAppointments(): Promise<PlanIncludedAppointments[]> {
  const { data, error } = await supabase
    .from("plan_included_appointments")
    .select("*")
    .order("included_appointments_monthly");
  if (error) throw error;
  return (data || []) as PlanIncludedAppointments[];
}

export async function loadPlanProjectSizeAccess(): Promise<PlanProjectSizeAccess[]> {
  const { data, error } = await supabase
    .from("plan_project_size_access")
    .select("*");
  if (error) throw error;
  return (data || []) as PlanProjectSizeAccess[];
}

export async function loadEntrepreneurUsage(contractorId: string): Promise<EntrepreneurUsage[]> {
  const { data, error } = await supabase
    .from("entrepreneur_plan_usage")
    .select("*")
    .eq("contractor_id", contractorId)
    .order("billing_cycle_start", { ascending: false });
  if (error) throw error;
  return (data || []) as EntrepreneurUsage[];
}

export async function loadMonthlySummaries(contractorId?: string): Promise<MonthlySummary[]> {
  let query = supabase
    .from("entrepreneur_monthly_appointment_summary")
    .select("*")
    .order("billing_month", { ascending: false });
  if (contractorId) query = query.eq("contractor_id", contractorId);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as MonthlySummary[];
}

// ── Exports ────────────────────────────────────────────────────────

export {
  SIZE_LABELS,
  SIZE_UNITS,
  SIZE_MULTIPLIERS,
  CAPTURE_FACTORS,
  SCARCITY_MULTIPLIERS,
  CLUSTER_VALUE_MULTIPLIERS,
  PLAN_SIZE_ACCESS,
  INCLUDED_APPOINTMENTS,
  BASE_EXTRA_PRICES,
};
