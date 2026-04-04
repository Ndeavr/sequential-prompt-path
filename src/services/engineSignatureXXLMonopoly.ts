/**
 * EngineSignatureXXLMonopoly
 * Verrouillage territorial XXL exclusif pour entrepreneurs Signature.
 * Garantit l'exclusivité des projets haute valeur dans un cluster/domaine.
 */

import type { ProjectSizeCode, PlanCode } from "./clusterProjectSizeMatrixEngine";

export type LockStatus = "active" | "pending" | "expired" | "revoked";

export interface TerritoryLock {
  id: string;
  entrepreneurId: string;
  entrepreneurName: string;
  cluster: string;
  domain: string;
  sizeCode: ProjectSizeCode;
  lockStatus: LockStatus;
  lockedAt: string;
  expiresAt: string | null;
  revenueProtectedMonthly: number;
  revenueProtectedAnnual: number;
  reason: string;
}

export interface MonopolyEligibility {
  eligible: boolean;
  reason: string;
  requiredPlan: PlanCode;
  currentPlan: PlanCode;
  availableTerritories: number;
  maxLocks: number;
  currentLocks: number;
}

// Rules
const MAX_LOCKS_PER_PLAN: Record<PlanCode, number> = {
  recrue: 0,
  pro: 0,
  premium: 0,
  elite: 0,
  signature: 3,
};

const ELIGIBLE_SIZES: ProjectSizeCode[] = ["xl", "xxl"];

/**
 * Check if an entrepreneur can lock a territory
 */
export function checkMonopolyEligibility(
  currentPlan: PlanCode,
  currentLocks: number,
  targetSize: ProjectSizeCode
): MonopolyEligibility {
  const maxLocks = MAX_LOCKS_PER_PLAN[currentPlan];

  if (currentPlan !== "signature") {
    return {
      eligible: false,
      reason: "Seuls les entrepreneurs Signature peuvent verrouiller des territoires",
      requiredPlan: "signature",
      currentPlan,
      availableTerritories: 0,
      maxLocks: 0,
      currentLocks,
    };
  }

  if (!ELIGIBLE_SIZES.includes(targetSize)) {
    return {
      eligible: false,
      reason: `Le verrouillage territorial n'est disponible que pour les tailles ${ELIGIBLE_SIZES.map(s => s.toUpperCase()).join(", ")}`,
      requiredPlan: "signature",
      currentPlan,
      availableTerritories: 0,
      maxLocks,
      currentLocks,
    };
  }

  if (currentLocks >= maxLocks) {
    return {
      eligible: false,
      reason: `Vous avez atteint le maximum de ${maxLocks} verrouillages territoriaux`,
      requiredPlan: "signature",
      currentPlan,
      availableTerritories: 0,
      maxLocks,
      currentLocks,
    };
  }

  return {
    eligible: true,
    reason: "Éligible au verrouillage territorial",
    requiredPlan: "signature",
    currentPlan,
    availableTerritories: maxLocks - currentLocks,
    maxLocks,
    currentLocks,
  };
}

/**
 * Compute revenue protection value for a territory lock
 */
export function computeRevenueProtection(
  avgProjectValue: number,
  demandEstimated: number,
  captureRate: number = 0.15
): { monthly: number; annual: number } {
  const annualRevenue = avgProjectValue * demandEstimated * captureRate;
  return {
    monthly: Math.round(annualRevenue / 12),
    annual: Math.round(annualRevenue),
  };
}

/**
 * Get lock status badge info
 */
export function getLockStatusInfo(status: LockStatus): { label: string; color: string; icon: string } {
  switch (status) {
    case "active":
      return { label: "Verrouillé", color: "text-emerald-400", icon: "Lock" };
    case "pending":
      return { label: "En attente", color: "text-amber-400", icon: "Clock" };
    case "expired":
      return { label: "Expiré", color: "text-red-400", icon: "Unlock" };
    case "revoked":
      return { label: "Révoqué", color: "text-gray-400", icon: "XCircle" };
  }
}

// Mock data
export const MOCK_TERRITORY_LOCKS: TerritoryLock[] = [
  {
    id: "lock-1",
    entrepreneurId: "ent-sig-1",
    entrepreneurName: "Rénovations Prestige Laval",
    cluster: "Laval",
    domain: "Rénovation complète",
    sizeCode: "xxl",
    lockStatus: "active",
    lockedAt: "2026-01-15",
    expiresAt: "2027-01-15",
    revenueProtectedMonthly: 37500,
    revenueProtectedAnnual: 450000,
    reason: "Exclusivité Signature — territoire XXL premium",
  },
  {
    id: "lock-2",
    entrepreneurId: "ent-sig-2",
    entrepreneurName: "Constructions Élite Montréal",
    cluster: "Montréal-Nord",
    domain: "Construction résidentielle",
    sizeCode: "xxl",
    lockStatus: "active",
    lockedAt: "2026-02-01",
    expiresAt: "2027-02-01",
    revenueProtectedMonthly: 52000,
    revenueProtectedAnnual: 624000,
    reason: "Exclusivité Signature — marché stratégique",
  },
  {
    id: "lock-3",
    entrepreneurId: "ent-sig-3",
    entrepreneurName: "Toitures Premium Rive-Sud",
    cluster: "Longueuil",
    domain: "Toiture",
    sizeCode: "xl",
    lockStatus: "active",
    lockedAt: "2026-03-01",
    expiresAt: "2027-03-01",
    revenueProtectedMonthly: 18000,
    revenueProtectedAnnual: 216000,
    reason: "Verrouillage XL — forte demande saisonnière",
  },
  {
    id: "lock-4",
    entrepreneurId: "ent-sig-1",
    entrepreneurName: "Rénovations Prestige Laval",
    cluster: "Laval",
    domain: "Cuisine complète",
    sizeCode: "xl",
    lockStatus: "pending",
    lockedAt: "2026-03-20",
    expiresAt: null,
    revenueProtectedMonthly: 14200,
    revenueProtectedAnnual: 170400,
    reason: "Demande de verrouillage en attente d'approbation",
  },
  {
    id: "lock-5",
    entrepreneurId: "ent-old-1",
    entrepreneurName: "Construction ABC",
    cluster: "Québec",
    domain: "Rénovation complète",
    sizeCode: "xxl",
    lockStatus: "expired",
    lockedAt: "2025-01-01",
    expiresAt: "2026-01-01",
    revenueProtectedMonthly: 0,
    revenueProtectedAnnual: 0,
    reason: "Contrat non renouvelé",
  },
];
