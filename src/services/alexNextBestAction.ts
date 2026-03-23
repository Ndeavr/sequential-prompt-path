/**
 * AlexNextBestAction — Returns THE single best next action.
 * Rule: never give multiple options. One action, one direction.
 */

import type { FrictionAnalysis } from "./alexFrictionEngine";
import type { EmotionalAnalysis } from "./alexEmotionalEngine";

export type UserRole = "homeowner" | "contractor" | "condo" | "admin";

export interface ActionContext {
  role: UserRole;
  currentPage: string;
  hasScore: boolean;
  hasUploadedPhoto: boolean;
  hasPendingBooking: boolean;
  hasSelectedPlan: boolean;
  hasContractorProfile: boolean;
  isReturningUser: boolean;
  friction: FrictionAnalysis;
  emotion: EmotionalAnalysis;
  memoryHints?: string[];
}

export interface NextAction {
  action: string;
  uiAction: string;
  alexText: string;
  priority: number; // 1 = highest
  confidence: number; // 0-1
}

// ─── Priority chains per role ───
const HOMEOWNER_CHAIN = [
  { check: (c: ActionContext) => !c.hasUploadedPhoto, action: "upload_photo", ui: "open_upload", text: "Le plus utile là, c'est une photo. Tu veux que je l'ouvre ?" },
  { check: (c: ActionContext) => !c.hasScore && c.hasUploadedPhoto, action: "generate_score", ui: "show_score", text: "Je peux te donner un score pour mieux comprendre la situation." },
  { check: (c: ActionContext) => c.hasScore && !c.hasPendingBooking, action: "prepare_booking", ui: "open_booking", text: "On peut préparer un rendez-vous avec le bon expert." },
  { check: (c: ActionContext) => c.hasPendingBooking, action: "complete_booking", ui: "open_booking", text: "Tu as un rendez-vous en attente. On le finalise ?" },
];

const CONTRACTOR_CHAIN = [
  { check: (c: ActionContext) => !c.hasScore, action: "show_aipp", ui: "show_score", text: "Ton score AIPP va m'aider à te guider. Tu veux le voir ?" },
  { check: (c: ActionContext) => c.hasScore && !c.hasSelectedPlan, action: "recommend_plan", ui: "show_plan", text: "Le meilleur prochain geste, c'est de comparer les plans. Je te montre le bon." },
  { check: (c: ActionContext) => c.hasSelectedPlan && !c.hasContractorProfile, action: "complete_profile", ui: "navigate", text: "Ton profil est presque prêt. On le complète ensemble ?" },
];

const CONDO_CHAIN = [
  { check: () => true, action: "clarify_role", ui: "navigate", text: "Il faut clarifier ça d'abord. C'est pour le syndicat ou une unité ?" },
];

export function getNextBestAction(context: ActionContext): NextAction {
  // If friction is critical, use friction's suggestion
  if (context.friction.level === "critical" && context.friction.recommendation.suggestedAction) {
    return {
      action: context.friction.recommendation.suggestedAction,
      uiAction: mapFrictionToUi(context.friction.recommendation.suggestedAction),
      alexText: getFrictionText(context.friction.recommendation.suggestedAction, context.emotion),
      priority: 1,
      confidence: 0.9,
    };
  }

  // Select chain by role
  const chain =
    context.role === "contractor" ? CONTRACTOR_CHAIN :
    context.role === "condo" ? CONDO_CHAIN :
    HOMEOWNER_CHAIN;

  // Find first applicable action
  for (let i = 0; i < chain.length; i++) {
    if (chain[i].check(context)) {
      return {
        action: chain[i].action,
        uiAction: chain[i].ui,
        alexText: adaptTextToEmotion(chain[i].text, context.emotion),
        priority: i + 1,
        confidence: Math.max(0.6, 0.95 - i * 0.1),
      };
    }
  }

  // Fallback
  return {
    action: "explore",
    uiAction: "navigate",
    alexText: "Tu veux qu'on explore ensemble ce qui serait le plus utile ?",
    priority: 10,
    confidence: 0.4,
  };
}

function mapFrictionToUi(action: string): string {
  const map: Record<string, string> = {
    resume_booking: "open_booking",
    open_upload: "open_upload",
    explain_score: "show_score",
    recommend_plan: "show_plan",
    simplify_and_guide: "navigate",
  };
  return map[action] ?? "navigate";
}

function getFrictionText(action: string, emotion: EmotionalAnalysis): string {
  if (emotion.state === "stressed") {
    return "Pas de pression. On y va à ton rythme.";
  }
  const map: Record<string, string> = {
    resume_booking: "Tu avais commencé un rendez-vous. On le reprend ?",
    open_upload: "Une photo va m'aider à mieux comprendre.",
    explain_score: "Ton score est là — je t'explique ce que ça veut dire.",
    recommend_plan: "Je pense avoir trouvé le bon plan pour toi.",
    simplify_and_guide: "On simplifie. Voici la seule chose à faire maintenant.",
  };
  return map[action] ?? "Voici ce que je recommande.";
}

function adaptTextToEmotion(text: string, emotion: EmotionalAnalysis): string {
  if (emotion.state === "urgent") {
    // Make it shorter, more direct
    return text.split(".")[0] + ".";
  }
  if (emotion.state === "hesitant") {
    return text.replace("Tu veux", "Si tu veux, on peut");
  }
  return text;
}
