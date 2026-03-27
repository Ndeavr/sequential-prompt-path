/**
 * AlexDomainCopilots — Specialized flows for homeowner, contractor, and condo.
 * Each copilot defines a progression chain and domain-specific guidance.
 */

export type CopilotDomain = "homeowner" | "contractor" | "condo" | "entrepreneur" | "condo_manager";

// ─── Entrepreneur Flow ───
const ENTREPRENEUR_STEPS: CopilotStep[] = [
  {
    id: "diagnostic",
    label: "Diagnostic rapide",
    alexPrompt: "Parlons de votre entreprise. Quel type de service offrez-vous ?",
    uiAction: "none",
    isComplete: () => false,
  },
  {
    id: "revenue_projection",
    label: "Projection de revenus",
    alexPrompt: "Voici combien de rendez-vous vous auriez besoin pour atteindre vos objectifs.",
    uiAction: "show_projection",
    isComplete: (ctx) => ctx.hasScore,
  },
  {
    id: "plan_recommendation",
    label: "Recommandation de plan",
    alexPrompt: "Avec votre objectif, je vous recommanderais de commencer ici.",
    uiAction: "show_plan_selector",
    isComplete: (ctx) => ctx.hasPlan,
  },
  {
    id: "profile_builder",
    label: "Créer le profil",
    alexPrompt: "On construit votre profil ensemble. Plus il est complet, plus vous êtes visible.",
    uiAction: "open_profile_builder",
    isComplete: (ctx) => ctx.hasProfile,
  },
  {
    id: "payment_activation",
    label: "Activation",
    alexPrompt: "Tout est prêt. On active votre profil ?",
    uiAction: "open_payment",
    isComplete: (ctx) => ctx.hasBooking,
  },
];

// ─── Condo Manager Flow ───
const CONDO_MANAGER_STEPS: CopilotStep[] = [
  {
    id: "building_profile",
    label: "Profil de l'immeuble",
    alexPrompt: "Commençons par les informations de base de votre copropriété.",
    uiAction: "none",
    isComplete: () => false,
  },
  {
    id: "loi16_check",
    label: "Audit Loi 16",
    alexPrompt: "Je vérifie votre conformité à la Loi 16. Quelques questions rapides.",
    uiAction: "show_compliance",
    isComplete: (ctx) => ctx.hasScore,
  },
  {
    id: "action_plan",
    label: "Plan d'action",
    alexPrompt: "Voici vos priorités, classées par urgence.",
    uiAction: "show_action_plan",
    isComplete: (ctx) => ctx.hasPlan,
  },
  {
    id: "pro_matching",
    label: "Trouver des pros",
    alexPrompt: "Je peux vous recommander des professionnels qualifiés pour vos travaux.",
    uiAction: "open_booking",
    isComplete: (ctx) => ctx.hasBooking,
  },
];

export interface CopilotStep {
  id: string;
  label: string;
  alexPrompt: string;
  uiAction: string;
  isComplete: (ctx: CopilotContext) => boolean;
}

export interface CopilotContext {
  hasPhoto: boolean;
  hasScore: boolean;
  hasBooking: boolean;
  hasPlan: boolean;
  hasProfile: boolean;
  isSyndicat?: boolean;
  isUnit?: boolean;
  urgencyLevel?: "low" | "medium" | "high" | "critical";
}

export interface CopilotState {
  domain: CopilotDomain;
  currentStep: CopilotStep;
  completedSteps: string[];
  totalSteps: number;
  progressPercent: number;
}

// ─── Homeowner Flow ───
const HOMEOWNER_STEPS: CopilotStep[] = [
  {
    id: "describe_problem",
    label: "Décrire le problème",
    alexPrompt: "Dis-moi ce qui se passe. Même en deux mots, ça m'aide.",
    uiAction: "none",
    isComplete: () => false, // controlled by conversation
  },
  {
    id: "upload_photo",
    label: "Ajouter une photo",
    alexPrompt: "Une photo va vraiment m'aider. Tu veux que j'ouvre l'appareil ?",
    uiAction: "open_upload",
    isComplete: (ctx) => ctx.hasPhoto,
  },
  {
    id: "view_score",
    label: "Voir le score",
    alexPrompt: "Voici ton score. Je t'explique ce que ça veut dire.",
    uiAction: "show_score",
    isComplete: (ctx) => ctx.hasScore,
  },
  {
    id: "prepare_booking",
    label: "Préparer un rendez-vous",
    alexPrompt: "On peut matcher avec le bon expert. Tu veux voir les disponibilités ?",
    uiAction: "open_booking",
    isComplete: (ctx) => ctx.hasBooking,
  },
];

// ─── Contractor Flow ───
const CONTRACTOR_STEPS: CopilotStep[] = [
  {
    id: "clarify_goal",
    label: "Clarifier l'objectif",
    alexPrompt: "Qu'est-ce que tu cherches à améliorer : plus de clients, meilleure visibilité, ou les deux ?",
    uiAction: "none",
    isComplete: () => false,
  },
  {
    id: "show_aipp",
    label: "Score AIPP",
    alexPrompt: "Ton score AIPP est prêt. C'est ta visibilité IA en un chiffre.",
    uiAction: "show_score",
    isComplete: (ctx) => ctx.hasScore,
  },
  {
    id: "recommend_plan",
    label: "Recommander un plan",
    alexPrompt: "Basé sur ton score, voici le plan qui va t'apporter le plus de résultats.",
    uiAction: "show_plan",
    isComplete: (ctx) => ctx.hasPlan,
  },
  {
    id: "complete_profile",
    label: "Compléter le profil",
    alexPrompt: "Ton profil a besoin de quelques ajouts pour être visible. On s'en occupe ?",
    uiAction: "navigate",
    isComplete: (ctx) => ctx.hasProfile,
  },
];

// ─── Condo Flow ───
const CONDO_STEPS: CopilotStep[] = [
  {
    id: "clarify_role",
    label: "Syndicat ou unité",
    alexPrompt: "C'est pour le syndicat de copropriété ou pour ton unité personnelle ?",
    uiAction: "none",
    isComplete: (ctx) => ctx.isSyndicat !== undefined || ctx.isUnit !== undefined,
  },
  {
    id: "identify_need",
    label: "Identifier le besoin",
    alexPrompt: "Est-ce que c'est une urgence, un projet planifié, ou une question de gouvernance ?",
    uiAction: "none",
    isComplete: () => false,
  },
  {
    id: "propose_action",
    label: "Proposer une action",
    alexPrompt: "Voici ce que je recommande comme prochaine étape.",
    uiAction: "navigate",
    isComplete: (ctx) => ctx.hasBooking,
  },
];

const FLOWS: Record<CopilotDomain, CopilotStep[]> = {
  homeowner: HOMEOWNER_STEPS,
  contractor: CONTRACTOR_STEPS,
  condo: CONDO_STEPS,
  entrepreneur: ENTREPRENEUR_STEPS,
  condo_manager: CONDO_MANAGER_STEPS,
};

export function getCopilotState(
  domain: CopilotDomain,
  context: CopilotContext
): CopilotState {
  const steps = FLOWS[domain];
  const completed = steps.filter((s) => s.isComplete(context)).map((s) => s.id);
  const current = steps.find((s) => !s.isComplete(context)) ?? steps[steps.length - 1];

  return {
    domain,
    currentStep: current,
    completedSteps: completed,
    totalSteps: steps.length,
    progressPercent: Math.round((completed.length / steps.length) * 100),
  };
}

export function getCopilotSteps(domain: CopilotDomain): CopilotStep[] {
  return FLOWS[domain];
}
