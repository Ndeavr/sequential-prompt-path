/**
 * UNPRO — Plan Capacity Distribution Engine v2 (No Free Plan)
 * Handles slot distribution, scarcity calculations, and upgrade pressure logic.
 */
import { supabase } from "@/integrations/supabase/client";

// ── Types ──────────────────────────────────────────────────────────
export type PlanCode = "recrue" | "pro" | "premium" | "elite" | "signature";
export type ScarcityStatus = "open" | "tight" | "rare" | "full" | "locked";
export type DistributionProfile = "standard" | "premium" | "strategic";
export type ClusterValueTier = "low" | "medium" | "high" | "elite";

export interface PlanDefinition {
  id: string;
  code: PlanCode;
  name: string;
  rank: number;
  base_price_monthly: number;
  is_paid: boolean;
  scarcity_multiplier_tight: number;
  scarcity_multiplier_rare: number;
  scarcity_multiplier_full: number;
  scarcity_multiplier_locked: number;
  priority_level: number;
  matching_boost: number;
  is_active: boolean;
}

export interface ClusterCapacity {
  id: string;
  cluster_key: string;
  plan_code: PlanCode;
  max_slots: number;
  occupied_slots: number;
  scarcity_status: ScarcityStatus;
  distribution_profile: DistributionProfile;
  waitlist_active: boolean;
}

export interface ClusterPricing {
  cluster_key: string;
  cluster_value_tier: ClusterValueTier;
  value_multiplier: number;
  demand_score: number;
  projected_monthly_revenue: number;
}

// ── Distribution Profiles ──────────────────────────────────────────
const DISTRIBUTION_PROFILES: Record<DistributionProfile, Record<PlanCode, number>> = {
  standard:  { recrue: 0.30, pro: 0.25, premium: 0.20, elite: 0.15, signature: 0.10 },
  premium:   { recrue: 0.20, pro: 0.25, premium: 0.25, elite: 0.20, signature: 0.10 },
  strategic: { recrue: 0.10, pro: 0.20, premium: 0.30, elite: 0.25, signature: 0.15 },
};

const PLAN_ORDER: PlanCode[] = ["signature", "elite", "premium", "pro", "recrue"];

const SCARCITY_MULTIPLIERS: Record<ScarcityStatus, number> = {
  open: 1.0,
  tight: 1.1,
  rare: 1.25,
  full: 1.5,
  locked: 1.75,
};

const VALUE_MULTIPLIERS: Record<ClusterValueTier, number> = {
  low: 0.9,
  medium: 1.0,
  high: 1.15,
  elite: 1.3,
};

// ── Compute Functions ──────────────────────────────────────────────

export function computePlanSlots(
  maxContractors: number,
  profile: DistributionProfile
): Record<PlanCode, number> {
  const dist = DISTRIBUTION_PROFILES[profile];
  const raw: Record<PlanCode, number> = {} as any;
  let total = 0;

  // Allocate in priority order (Signature first)
  for (const plan of PLAN_ORDER) {
    raw[plan] = Math.floor(maxContractors * dist[plan]);
    total += raw[plan];
  }

  // Distribute remainder to highest priority plans
  let remainder = maxContractors - total;
  for (const plan of PLAN_ORDER) {
    if (remainder <= 0) break;
    raw[plan]++;
    remainder--;
  }

  return raw;
}

export function computeScarcityStatus(occupied: number, max: number): ScarcityStatus {
  if (max <= 0) return "full";
  const ratio = occupied / max;
  if (ratio >= 0.95) return "full";
  if (ratio >= 0.80) return "rare";
  if (ratio >= 0.60) return "tight";
  return "open";
}

export function getScarcityMultiplier(status: ScarcityStatus): number {
  return SCARCITY_MULTIPLIERS[status];
}

export function getValueMultiplier(tier: ClusterValueTier): number {
  return VALUE_MULTIPLIERS[tier];
}

export function computeEffectivePrice(
  basePriceMonthly: number,
  scarcityStatus: ScarcityStatus,
  valueTier: ClusterValueTier
): number {
  return Math.round(basePriceMonthly * SCARCITY_MULTIPLIERS[scarcityStatus] * VALUE_MULTIPLIERS[valueTier]);
}

export function getScarcityLabel(status: ScarcityStatus): string {
  const labels: Record<ScarcityStatus, string> = {
    open: "Disponible",
    tight: "Limité",
    rare: "Rare",
    full: "Complet",
    locked: "Exclusif",
  };
  return labels[status];
}

export function getRemainingSlots(capacity: ClusterCapacity): number {
  return Math.max(0, capacity.max_slots - capacity.occupied_slots);
}

export function getOccupancyPercent(capacity: ClusterCapacity): number {
  if (capacity.max_slots <= 0) return 100;
  return Math.round((capacity.occupied_slots / capacity.max_slots) * 100);
}

// ── Upgrade Pressure ───────────────────────────────────────────────

export interface UpgradePressureMessage {
  text: string;
  urgency: "low" | "medium" | "high" | "critical";
  targetPlan?: PlanCode;
}

export function computeUpgradePressure(
  currentPlan: PlanCode,
  clusterCapacities: ClusterCapacity[]
): UpgradePressureMessage | null {
  const currentCap = clusterCapacities.find(c => c.plan_code === currentPlan);
  if (!currentCap) return null;

  const remaining = getRemainingSlots(currentCap);

  if (currentCap.scarcity_status === "full") {
    const nextPlan = getNextPlan(currentPlan);
    if (!nextPlan) return null;
    return {
      text: `Plan ${currentCap.plan_code} complet. Passez ${getPlanLabel(nextPlan)} pour rester visible.`,
      urgency: "critical",
      targetPlan: nextPlan,
    };
  }

  if (currentCap.scarcity_status === "rare" || remaining <= 3) {
    return {
      text: `${remaining} place${remaining > 1 ? "s" : ""} ${getPlanLabel(currentPlan)} restante${remaining > 1 ? "s" : ""} dans votre secteur`,
      urgency: "high",
    };
  }

  if (currentCap.scarcity_status === "tight") {
    const nextPlan = getNextPlan(currentPlan);
    if (nextPlan) {
      return {
        text: `Passez ${getPlanLabel(nextPlan)} pour rester visible`,
        urgency: "medium",
        targetPlan: nextPlan,
      };
    }
  }

  return null;
}

function getNextPlan(current: PlanCode): PlanCode | null {
  const order: PlanCode[] = ["recrue", "pro", "premium", "elite", "signature"];
  const idx = order.indexOf(current);
  if (idx < 0 || idx >= order.length - 1) return null;
  return order[idx + 1];
}

function getPlanLabel(code: PlanCode): string {
  const labels: Record<PlanCode, string> = {
    recrue: "Recrue",
    pro: "Pro",
    premium: "Premium",
    elite: "Élite",
    signature: "Signature",
  };
  return labels[code];
}

// ── Revenue Projections ────────────────────────────────────────────

export function computeClusterRevenue(
  capacities: ClusterCapacity[],
  plans: PlanDefinition[],
  valueTier: ClusterValueTier = "medium"
): { monthly: number; annual: number; perPlan: Record<string, number> } {
  const perPlan: Record<string, number> = {};
  let monthly = 0;

  for (const cap of capacities) {
    const plan = plans.find(p => p.code === cap.plan_code);
    if (!plan) continue;
    const effective = computeEffectivePrice(plan.base_price_monthly, cap.scarcity_status, valueTier);
    const planRevenue = effective * cap.occupied_slots;
    perPlan[cap.plan_code] = planRevenue;
    monthly += planRevenue;
  }

  return { monthly, annual: monthly * 12, perPlan };
}

// ── Data Access ────────────────────────────────────────────────────

export async function loadPlanDefinitions(): Promise<PlanDefinition[]> {
  const { data, error } = await supabase
    .from("plan_definitions")
    .select("*")
    .eq("is_active", true)
    .order("rank");
  if (error) throw error;
  return (data || []) as PlanDefinition[];
}

export async function loadClusterCapacities(clusterKey?: string): Promise<ClusterCapacity[]> {
  let query = supabase.from("cluster_plan_capacity").select("*");
  if (clusterKey) query = query.eq("cluster_key", clusterKey);
  const { data, error } = await query.order("plan_code");
  if (error) throw error;
  return (data || []) as ClusterCapacity[];
}

export async function loadClusterPricing(clusterKey?: string): Promise<ClusterPricing[]> {
  let query = supabase.from("cluster_pricing_multipliers").select("*").eq("is_active", true);
  if (clusterKey) query = query.eq("cluster_key", clusterKey);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as ClusterPricing[];
}

export { DISTRIBUTION_PROFILES, PLAN_ORDER, SCARCITY_MULTIPLIERS, VALUE_MULTIPLIERS };
