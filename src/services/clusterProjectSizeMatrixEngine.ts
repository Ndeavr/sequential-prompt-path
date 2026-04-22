/**
 * UNPRO — Cluster × Plan × Project Size Matrix Engine
 * Computes capacity, pricing, revenue, scarcity and upgrade pressure
 * for every combination of cluster × domain × plan × project_size.
 */

// ── Types ──────────────────────────────────────────────────────────
export type PlanCode = "recrue" | "pro" | "premium" | "elite" | "signature";
export type ProjectSizeCode = "xs" | "s" | "m" | "l" | "xl" | "xxl";
export type ScarcityStatus = "open" | "tight" | "rare" | "full" | "locked";
export type DistributionProfile = "standard" | "premium" | "strategic";
export type ClusterValueTier = "low" | "medium" | "high" | "elite";
export type MarketControlProfile = "starter" | "standard" | "premium" | "strategic";

export interface ProjectSizeDefinition {
  code: ProjectSizeCode;
  label: string;
  min_project_value: number;
  max_project_value: number | null;
  avg_project_value: number;
  jobs_per_contractor: number;
  size_weight: number;
  size_multiplier: number;
  color_token: string;
}

export interface PlanDefinition {
  code: PlanCode;
  name: string;
  rank: number;
  base_price_monthly: number; // in cents
  visibility_weight: number;
  high_ticket_priority: boolean;
}

export interface PlanSizeAccess {
  plan: PlanCode;
  size: ProjectSizeCode;
  allowed: boolean;
  upgrade_target?: PlanCode;
}

export interface MatrixRow {
  cluster: string;
  domain: string;
  plan: PlanCode;
  planName: string;
  planRank: number;
  projectSize: ProjectSizeCode;
  sizeLabel: string;
  accessAllowed: boolean;
  marketTier: ClusterValueTier;
  annualDemandSize: number;
  annualMarketValueSize: number;
  maxContractorsSize: number;
  planPercentage: number;
  maxSlots: number;
  currentSlots: number;
  remainingSlots: number;
  occupancyRate: number;
  scarcityStatus: ScarcityStatus;
  baseMonthlyPrice: number;
  finalMonthlyPrice: number;
  finalAnnualPrice: number;
  revenueIfFullMonthly: number;
  revenueIfFullAnnual: number;
  revenueCurrentMonthly: number;
  revenueCurrentAnnual: number;
  revenueGapAnnual: number;
  upgradeRequired: boolean;
  locked: boolean;
}

// ── Constants ──────────────────────────────────────────────────────

export const PROJECT_SIZES: ProjectSizeDefinition[] = [
  { code: "xs", label: "XS", min_project_value: 0, max_project_value: 1000, avg_project_value: 500, jobs_per_contractor: 300, size_weight: 1, size_multiplier: 0.50, color_token: "slate" },
  { code: "s", label: "S", min_project_value: 1000, max_project_value: 5000, avg_project_value: 2500, jobs_per_contractor: 200, size_weight: 2, size_multiplier: 0.70, color_token: "blue" },
  { code: "m", label: "M", min_project_value: 5000, max_project_value: 15000, avg_project_value: 10000, jobs_per_contractor: 120, size_weight: 3, size_multiplier: 1.00, color_token: "emerald" },
  { code: "l", label: "L", min_project_value: 15000, max_project_value: 40000, avg_project_value: 25000, jobs_per_contractor: 60, size_weight: 4, size_multiplier: 1.30, color_token: "amber" },
  { code: "xl", label: "XL", min_project_value: 40000, max_project_value: 100000, avg_project_value: 65000, jobs_per_contractor: 30, size_weight: 5, size_multiplier: 1.70, color_token: "orange" },
  { code: "xxl", label: "XXL", min_project_value: 100000, max_project_value: null, avg_project_value: 150000, jobs_per_contractor: 12, size_weight: 6, size_multiplier: 2.50, color_token: "rose" },
];

export const PLANS: PlanDefinition[] = [
  { code: "recrue", name: "Recrue", rank: 1, base_price_monthly: 149, visibility_weight: 1.0, high_ticket_priority: false },
  { code: "pro", name: "Pro", rank: 2, base_price_monthly: 349, visibility_weight: 1.2, high_ticket_priority: false },
  { code: "premium", name: "Premium", rank: 3, base_price_monthly: 599, visibility_weight: 1.5, high_ticket_priority: false },
  { code: "elite", name: "Élite", rank: 4, base_price_monthly: 999, visibility_weight: 1.8, high_ticket_priority: true },
  { code: "signature", name: "Signature", rank: 5, base_price_monthly: 1799, visibility_weight: 2.0, high_ticket_priority: true },
];

export const PLAN_SIZE_ACCESS: PlanSizeAccess[] = [
  { plan: "recrue", size: "xs", allowed: true }, { plan: "recrue", size: "s", allowed: true },
  { plan: "recrue", size: "m", allowed: false, upgrade_target: "pro" }, { plan: "recrue", size: "l", allowed: false, upgrade_target: "premium" },
  { plan: "recrue", size: "xl", allowed: false, upgrade_target: "elite" }, { plan: "recrue", size: "xxl", allowed: false, upgrade_target: "signature" },
  { plan: "pro", size: "xs", allowed: true }, { plan: "pro", size: "s", allowed: true },
  { plan: "pro", size: "m", allowed: true }, { plan: "pro", size: "l", allowed: false, upgrade_target: "premium" },
  { plan: "pro", size: "xl", allowed: false, upgrade_target: "elite" }, { plan: "pro", size: "xxl", allowed: false, upgrade_target: "signature" },
  { plan: "premium", size: "xs", allowed: true }, { plan: "premium", size: "s", allowed: true },
  { plan: "premium", size: "m", allowed: true }, { plan: "premium", size: "l", allowed: true },
  { plan: "premium", size: "xl", allowed: false, upgrade_target: "elite" }, { plan: "premium", size: "xxl", allowed: false, upgrade_target: "signature" },
  { plan: "elite", size: "xs", allowed: true }, { plan: "elite", size: "s", allowed: true },
  { plan: "elite", size: "m", allowed: true }, { plan: "elite", size: "l", allowed: true },
  { plan: "elite", size: "xl", allowed: true }, { plan: "elite", size: "xxl", allowed: false, upgrade_target: "signature" },
  { plan: "signature", size: "xs", allowed: true }, { plan: "signature", size: "s", allowed: true },
  { plan: "signature", size: "m", allowed: true }, { plan: "signature", size: "l", allowed: true },
  { plan: "signature", size: "xl", allowed: true }, { plan: "signature", size: "xxl", allowed: true },
];

const DISTRIBUTION_PROFILES: Record<DistributionProfile, Record<PlanCode, number>> = {
  standard: { recrue: 30, pro: 25, premium: 20, elite: 15, signature: 10 },
  premium: { recrue: 20, pro: 25, premium: 25, elite: 20, signature: 10 },
  strategic: { recrue: 10, pro: 20, premium: 30, elite: 25, signature: 15 },
};

const SIZE_DISTRIBUTION_STANDARD: Record<ProjectSizeCode, number> = {
  xs: 25, s: 30, m: 20, l: 12, xl: 8, xxl: 5,
};

const SCARCITY_MULTIPLIERS: Record<ScarcityStatus, number> = {
  open: 1.0, tight: 1.1, rare: 1.25, full: 1.5, locked: 1.75,
};

const CLUSTER_VALUE_MULTIPLIERS: Record<ClusterValueTier, number> = {
  low: 0.9, medium: 1.0, high: 1.15, elite: 1.3,
};

const MARKET_CONTROL_FACTORS: Record<MarketControlProfile, number> = {
  starter: 0.55, standard: 0.65, premium: 0.75, strategic: 0.80,
};

// ── Engine Functions ───────────────────────────────────────────────

export function isPlanSizeAccessAllowed(plan: PlanCode, size: ProjectSizeCode): boolean {
  const access = PLAN_SIZE_ACCESS.find(a => a.plan === plan && a.size === size);
  return access?.allowed ?? false;
}

export function getUpgradeTarget(plan: PlanCode, size: ProjectSizeCode): PlanCode | undefined {
  const access = PLAN_SIZE_ACCESS.find(a => a.plan === plan && a.size === size);
  return access?.upgrade_target;
}

export function computeScarcityStatus(current: number, max: number, locked = false): ScarcityStatus {
  if (locked) return "locked";
  if (max <= 0) return "full";
  const rate = current / max;
  if (rate >= 0.95) return "full";
  if (rate >= 0.80) return "rare";
  if (rate >= 0.60) return "tight";
  return "open";
}

export function computeFinalMonthlyPrice(
  basePriceMonthly: number,
  sizeCode: ProjectSizeCode,
  scarcityStatus: ScarcityStatus = "open",
  clusterValueTier: ClusterValueTier = "medium"
): number {
  const sizeDef = PROJECT_SIZES.find(s => s.code === sizeCode)!;
  const price = basePriceMonthly * sizeDef.size_multiplier * SCARCITY_MULTIPLIERS[scarcityStatus] * CLUSTER_VALUE_MULTIPLIERS[clusterValueTier];
  return Math.round(price * 100) / 100;
}

export interface ClusterDomainInput {
  clusterName: string;
  domainName: string;
  annualDemandTotal: number;
  marketControlProfile: MarketControlProfile;
  clusterValueTier: ClusterValueTier;
  distributionProfile: DistributionProfile;
  sizeDistribution?: Partial<Record<ProjectSizeCode, number>>;
  currentSlots?: Partial<Record<`${PlanCode}_${ProjectSizeCode}`, number>>;
}

export function computeFullMatrix(input: ClusterDomainInput): MatrixRow[] {
  const {
    clusterName, domainName, annualDemandTotal,
    marketControlProfile, clusterValueTier, distributionProfile,
    sizeDistribution = SIZE_DISTRIBUTION_STANDARD,
    currentSlots = {},
  } = input;

  const mcf = MARKET_CONTROL_FACTORS[marketControlProfile];
  const planDist = DISTRIBUTION_PROFILES[distributionProfile];
  const rows: MatrixRow[] = [];

  for (const size of PROJECT_SIZES) {
    const sizePct = (sizeDistribution[size.code] ?? SIZE_DISTRIBUTION_STANDARD[size.code]) / 100;
    const demandSize = annualDemandTotal * sizePct;
    const maxContractorsRaw = demandSize / size.jobs_per_contractor;
    const maxContractorsSize = Math.round(maxContractorsRaw * mcf);
    const annualMarketValueSize = demandSize * size.avg_project_value;

    // Distribute slots across plans
    const planSlots: Record<PlanCode, number> = { recrue: 0, pro: 0, premium: 0, elite: 0, signature: 0 };
    let totalAssigned = 0;

    // First pass: floor allocation for allowed plans
    const planOrder: PlanCode[] = ["signature", "elite", "premium", "pro", "recrue"];
    for (const plan of PLANS) {
      if (!isPlanSizeAccessAllowed(plan.code, size.code)) {
        planSlots[plan.code] = 0;
        continue;
      }
      planSlots[plan.code] = Math.floor(maxContractorsSize * planDist[plan.code] / 100);
      totalAssigned += planSlots[plan.code];
    }

    // Redistribute remainder by priority (Signature first)
    let remainder = maxContractorsSize - totalAssigned;
    for (const pc of planOrder) {
      if (remainder <= 0) break;
      if (isPlanSizeAccessAllowed(pc, size.code)) {
        planSlots[pc] += 1;
        remainder -= 1;
      }
    }

    // Redistribute slots from inaccessible plans to accessible ones
    for (const plan of PLANS) {
      if (!isPlanSizeAccessAllowed(plan.code, size.code)) {
        const blocked = Math.floor(maxContractorsSize * planDist[plan.code] / 100);
        if (blocked > 0) {
          // Give to highest accessible plan
          for (const pc of planOrder) {
            if (isPlanSizeAccessAllowed(pc, size.code)) {
              planSlots[pc] += blocked;
              break;
            }
          }
        }
      }
    }

    for (const plan of PLANS) {
      const allowed = isPlanSizeAccessAllowed(plan.code, size.code);
      const maxSlots = planSlots[plan.code];
      const key = `${plan.code}_${size.code}` as `${PlanCode}_${ProjectSizeCode}`;
      const current = currentSlots[key] ?? 0;
      const remaining = Math.max(0, maxSlots - current);
      const occupancyRate = maxSlots > 0 ? current / maxSlots : 0;
      const scarcity = computeScarcityStatus(current, maxSlots);
      const finalMonthly = computeFinalMonthlyPrice(plan.base_price_monthly, size.code, scarcity, clusterValueTier);
      const finalAnnual = finalMonthly * 12;

      rows.push({
        cluster: clusterName,
        domain: domainName,
        plan: plan.code,
        planName: plan.name,
        planRank: plan.rank,
        projectSize: size.code,
        sizeLabel: size.label,
        accessAllowed: allowed,
        marketTier: clusterValueTier,
        annualDemandSize: Math.round(demandSize),
        annualMarketValueSize: Math.round(annualMarketValueSize),
        maxContractorsSize,
        planPercentage: allowed ? planDist[plan.code] : 0,
        maxSlots,
        currentSlots: current,
        remainingSlots: remaining,
        occupancyRate: Math.round(occupancyRate * 100) / 100,
        scarcityStatus: scarcity,
        baseMonthlyPrice: plan.base_price_monthly,
        finalMonthlyPrice: finalMonthly,
        finalAnnualPrice: finalAnnual,
        revenueIfFullMonthly: Math.round(maxSlots * finalMonthly * 100) / 100,
        revenueIfFullAnnual: Math.round(maxSlots * finalAnnual * 100) / 100,
        revenueCurrentMonthly: Math.round(current * finalMonthly * 100) / 100,
        revenueCurrentAnnual: Math.round(current * finalAnnual * 100) / 100,
        revenueGapAnnual: Math.round((maxSlots - current) * finalAnnual * 100) / 100,
        upgradeRequired: !allowed,
        locked: false,
      });
    }
  }

  return rows;
}

// ── Aggregate Helpers ──────────────────────────────────────────────

export function getMatrixSummary(rows: MatrixRow[]) {
  const totalRevenueIfFull = rows.reduce((s, r) => s + r.revenueIfFullAnnual, 0);
  const totalRevenueCurrent = rows.reduce((s, r) => s + r.revenueCurrentAnnual, 0);
  const totalGap = totalRevenueIfFull - totalRevenueCurrent;
  const totalSlots = rows.reduce((s, r) => s + r.maxSlots, 0);
  const totalOccupied = rows.reduce((s, r) => s + r.currentSlots, 0);
  const rareCount = rows.filter(r => r.scarcityStatus === "rare" || r.scarcityStatus === "full").length;
  const highTicketRows = rows.filter(r => (r.projectSize === "xl" || r.projectSize === "xxl") && r.revenueGapAnnual > 50000);

  return {
    totalRevenueIfFull: Math.round(totalRevenueIfFull),
    totalRevenueCurrent: Math.round(totalRevenueCurrent),
    totalGap: Math.round(totalGap),
    totalSlots,
    totalOccupied,
    globalOccupancy: totalSlots > 0 ? Math.round((totalOccupied / totalSlots) * 100) : 0,
    rareCount,
    highTicketOpportunities: highTicketRows.length,
  };
}

export interface UpgradePressureMessage {
  text: string;
  urgency: "low" | "medium" | "high" | "critical";
  targetPlan?: string;
  projectSize?: string;
}

export function computeUpgradePressureBySize(rows: MatrixRow[]): UpgradePressureMessage[] {
  const messages: UpgradePressureMessage[] = [];

  for (const row of rows) {
    if (!row.accessAllowed) continue;
    if (row.remainingSlots <= 3 && row.remainingSlots > 0) {
      messages.push({
        text: `Plus que ${row.remainingSlots} place${row.remainingSlots > 1 ? "s" : ""} ${row.sizeLabel} dans votre secteur`,
        urgency: row.remainingSlots <= 1 ? "critical" : "high",
        projectSize: row.sizeLabel,
      });
    }
    if (row.scarcityStatus === "rare" && (row.projectSize === "xl" || row.projectSize === "xxl")) {
      messages.push({
        text: `Accès ${row.sizeLabel} presque verrouillé`,
        urgency: "critical",
        targetPlan: "Signature",
        projectSize: row.sizeLabel,
      });
    }
  }

  return messages.slice(0, 5);
}

// ── Mock Data Generator ────────────────────────────────────────────

export function generateLavalIsolationMock(): MatrixRow[] {
  return computeFullMatrix({
    clusterName: "Laval",
    domainName: "Isolation entretoit",
    annualDemandTotal: 14080,
    marketControlProfile: "premium",
    clusterValueTier: "high",
    distributionProfile: "premium",
    currentSlots: {
      recrue_xs: 8, recrue_s: 6,
      pro_xs: 5, pro_s: 4, pro_m: 3,
      premium_xs: 3, premium_s: 3, premium_m: 2, premium_l: 2,
      elite_xs: 2, elite_s: 2, elite_m: 1, elite_l: 1, elite_xl: 1,
      signature_xs: 1, signature_s: 1, signature_m: 1, signature_l: 1, signature_xl: 1, signature_xxl: 0,
    },
  });
}
