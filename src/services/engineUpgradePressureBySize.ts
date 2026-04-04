/**
 * EngineUpgradePressureBySize
 * Génère des événements de pression d'upgrade basés sur la taille de projet,
 * les slots restants, la rareté et le volume d'extra.
 */

import type { ProjectSizeCode, PlanCode } from "./clusterProjectSizeMatrixEngine";

export type PressureType =
  | "size_blocked"
  | "slots_rare"
  | "high_ticket_missed"
  | "overage_break_even"
  | "xxl_exclusive"
  | "recurring_xl";

export interface UpgradePressureEvent {
  id: string;
  entrepreneurId: string;
  entrepreneurName: string;
  targetSizeCode: ProjectSizeCode;
  currentPlan: PlanCode;
  recommendedPlan: PlanCode;
  pressureType: PressureType;
  pressureScore: number; // 0-100
  messageFr: string;
  messageEn: string;
  ctaAction: string;
  dismissed: boolean;
  converted: boolean;
  createdAt: string;
}

// Plan hierarchy for upgrade targets
const PLAN_UPGRADE_MAP: Record<PlanCode, PlanCode | null> = {
  recrue: "pro",
  pro: "premium",
  premium: "elite",
  elite: "signature",
  signature: null,
};

// Plan access map
const PLAN_SIZE_ACCESS: Record<PlanCode, ProjectSizeCode[]> = {
  recrue: ["xs", "s"],
  pro: ["xs", "s", "m"],
  premium: ["xs", "s", "m", "l"],
  elite: ["xs", "s", "m", "l", "xl"],
  signature: ["xs", "s", "m", "l", "xl", "xxl"],
};

// Plan prices
const PLAN_PRICES: Record<PlanCode, number> = {
  recrue: 99,
  pro: 199,
  premium: 399,
  elite: 699,
  signature: 1499,
};

/**
 * Check if a size is accessible for a plan
 */
export function isSizeAccessible(plan: PlanCode, size: ProjectSizeCode): boolean {
  return PLAN_SIZE_ACCESS[plan].includes(size);
}

/**
 * Get required plan for a project size
 */
export function getRequiredPlanForSize(size: ProjectSizeCode): PlanCode {
  const sizeToMinPlan: Record<ProjectSizeCode, PlanCode> = {
    xs: "recrue",
    s: "recrue",
    m: "pro",
    l: "premium",
    xl: "elite",
    xxl: "signature",
  };
  return sizeToMinPlan[size];
}

/**
 * Generate upgrade pressure message
 */
export function generatePressureMessage(
  pressureType: PressureType,
  currentPlan: PlanCode,
  targetSize: ProjectSizeCode,
  recommendedPlan: PlanCode
): { fr: string; en: string; cta: string } {
  const planNames: Record<PlanCode, string> = {
    recrue: "Recrue",
    pro: "Pro",
    premium: "Premium",
    elite: "Élite",
    signature: "Signature",
  };

  switch (pressureType) {
    case "size_blocked":
      return {
        fr: `Votre plan ${planNames[currentPlan]} ne couvre pas les projets ${targetSize.toUpperCase()}. Passez ${planNames[recommendedPlan]} pour y accéder.`,
        en: `Your ${planNames[currentPlan]} plan doesn't cover ${targetSize.toUpperCase()} projects. Upgrade to ${planNames[recommendedPlan]}.`,
        cta: `upgrade_to_${recommendedPlan}`,
      };
    case "slots_rare":
      return {
        fr: `Dernières places pour les projets ${targetSize.toUpperCase()} dans votre secteur. Sécurisez votre position.`,
        en: `Last spots for ${targetSize.toUpperCase()} projects in your area. Secure your position.`,
        cta: "secure_slot",
      };
    case "high_ticket_missed":
      return {
        fr: `Vous manquez des projets haute valeur (${targetSize.toUpperCase()}). Passez ${planNames[recommendedPlan]} pour capturer ces opportunités.`,
        en: `You're missing high-value ${targetSize.toUpperCase()} projects. Upgrade to ${planNames[recommendedPlan]}.`,
        cta: `upgrade_to_${recommendedPlan}`,
      };
    case "overage_break_even":
      return {
        fr: `Vos rendez-vous extra coûtent presque autant que la différence avec le plan ${planNames[recommendedPlan]}. Économisez en passant au plan supérieur.`,
        en: `Your extra appointments cost nearly as much as upgrading to ${planNames[recommendedPlan]}. Save by upgrading.`,
        cta: `upgrade_to_${recommendedPlan}`,
      };
    case "xxl_exclusive":
      return {
        fr: `Les projets XXL sont réservés aux entrepreneurs Signature. Accédez à l'exclusivité territoriale.`,
        en: `XXL projects are exclusive to Signature entrepreneurs. Access territorial exclusivity.`,
        cta: "upgrade_to_signature",
      };
    case "recurring_xl":
      return {
        fr: `Votre volume XL/XXL récurrent justifie un passage ${planNames[recommendedPlan]} pour maximiser vos rendez-vous.`,
        en: `Your recurring XL/XXL volume justifies upgrading to ${planNames[recommendedPlan]}.`,
        cta: `upgrade_to_${recommendedPlan}`,
      };
  }
}

/**
 * Compute upgrade pressure score (0-100)
 */
export function computePressureScore(params: {
  pressureType: PressureType;
  remainingSlots?: number;
  overageAmount?: number;
  breakEvenThreshold?: number;
  projectValue?: number;
}): number {
  let score = 0;

  switch (params.pressureType) {
    case "size_blocked":
      score = 85;
      break;
    case "slots_rare":
      score = params.remainingSlots !== undefined ? Math.min(95, 100 - params.remainingSlots * 15) : 70;
      break;
    case "high_ticket_missed":
      score = params.projectValue ? Math.min(95, 60 + (params.projectValue / 10000) * 5) : 75;
      break;
    case "overage_break_even":
      if (params.overageAmount && params.breakEvenThreshold) {
        const ratio = params.overageAmount / params.breakEvenThreshold;
        score = Math.min(98, Math.round(ratio * 100));
      } else {
        score = 70;
      }
      break;
    case "xxl_exclusive":
      score = 90;
      break;
    case "recurring_xl":
      score = 80;
      break;
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Get pressure severity label
 */
export function getPressureSeverity(score: number): { label: string; color: string } {
  if (score >= 85) return { label: "Critique", color: "text-red-400" };
  if (score >= 70) return { label: "Fort", color: "text-orange-400" };
  if (score >= 50) return { label: "Modéré", color: "text-amber-400" };
  return { label: "Faible", color: "text-blue-400" };
}

// Mock data
export const MOCK_UPGRADE_PRESSURE_EVENTS: UpgradePressureEvent[] = [
  {
    id: "up-1",
    entrepreneurId: "ent-1",
    entrepreneurName: "Plomberie Martin",
    targetSizeCode: "m",
    currentPlan: "recrue",
    recommendedPlan: "pro",
    pressureType: "size_blocked",
    pressureScore: 85,
    messageFr: "Votre plan Recrue ne couvre pas les projets M. Passez Pro pour y accéder.",
    messageEn: "Your Recrue plan doesn't cover M projects. Upgrade to Pro.",
    ctaAction: "upgrade_to_pro",
    dismissed: false,
    converted: false,
    createdAt: "2026-04-01",
  },
  {
    id: "up-2",
    entrepreneurId: "ent-2",
    entrepreneurName: "Isolation Québec Plus",
    targetSizeCode: "xl",
    currentPlan: "premium",
    recommendedPlan: "elite",
    pressureType: "high_ticket_missed",
    pressureScore: 78,
    messageFr: "Vous manquez des projets haute valeur (XL). Passez Élite pour capturer ces opportunités.",
    messageEn: "You're missing high-value XL projects. Upgrade to Élite.",
    ctaAction: "upgrade_to_elite",
    dismissed: false,
    converted: false,
    createdAt: "2026-04-02",
  },
  {
    id: "up-3",
    entrepreneurId: "ent-3",
    entrepreneurName: "Toitures Laval Inc.",
    targetSizeCode: "l",
    currentPlan: "pro",
    recommendedPlan: "premium",
    pressureType: "slots_rare",
    pressureScore: 92,
    messageFr: "Dernières places pour les projets L dans votre secteur. Sécurisez votre position.",
    messageEn: "Last spots for L projects in your area. Secure your position.",
    ctaAction: "secure_slot",
    dismissed: false,
    converted: true,
    createdAt: "2026-03-28",
  },
  {
    id: "up-4",
    entrepreneurId: "ent-4",
    entrepreneurName: "Réno Express Montréal",
    targetSizeCode: "xxl",
    currentPlan: "elite",
    recommendedPlan: "signature",
    pressureType: "xxl_exclusive",
    pressureScore: 90,
    messageFr: "Les projets XXL sont réservés aux entrepreneurs Signature. Accédez à l'exclusivité territoriale.",
    messageEn: "XXL projects are exclusive to Signature entrepreneurs.",
    ctaAction: "upgrade_to_signature",
    dismissed: false,
    converted: false,
    createdAt: "2026-04-03",
  },
  {
    id: "up-5",
    entrepreneurId: "ent-5",
    entrepreneurName: "Cuisine Design Sherbrooke",
    targetSizeCode: "xl",
    currentPlan: "premium",
    recommendedPlan: "elite",
    pressureType: "overage_break_even",
    pressureScore: 88,
    messageFr: "Vos rendez-vous extra coûtent presque autant que la différence avec le plan Élite. Économisez en passant au plan supérieur.",
    messageEn: "Your extra appointments cost nearly as much as upgrading to Élite.",
    ctaAction: "upgrade_to_elite",
    dismissed: true,
    converted: false,
    createdAt: "2026-03-25",
  },
];
