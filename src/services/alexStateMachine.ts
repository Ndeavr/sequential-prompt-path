/**
 * AlexStateMachine — State resolver for Alex Concierge V2.
 * 
 * States:
 *   NOT_LOGGED → user must authenticate
 *   LOGGED_NO_PROPERTY → user has no property context
 *   CONTEXT_UNKNOWN → user logged + property but no intent
 *   CONTEXT_DEFINED → intent detected, ready to match
 *   MATCHING → matching in progress
 *   MATCH_FOUND → contractor recommended
 *   BOOKING_READY → booking intent created
 *   NO_MATCH → no contractor available
 */

export type AlexState =
  | "NOT_LOGGED"
  | "LOGGED_NO_PROPERTY"
  | "CONTEXT_UNKNOWN"
  | "CONTEXT_DEFINED"
  | "MATCHING"
  | "MATCH_FOUND"
  | "BOOKING_READY"
  | "NO_MATCH"
  | "ERROR";

export interface AlexContext {
  userId: string | null;
  isAuthenticated: boolean;
  hasProperty: boolean;
  intentDetected: string | null;
  category: string | null;
  urgency: string | null;
  budgetRange: string | null;
  matchedContractor: MatchedContractor | null;
  bookingIntentId: string | null;
}

export interface MatchedContractor {
  id: string;
  companyName: string;
  aippScore: number;
  tier: string;
  reason: string;
  estimatedDelay: string;
  estimatedPriceMin: number;
  estimatedPriceMax: number;
  avatarUrl?: string;
}

export interface StateResolution {
  state: AlexState;
  greeting: string;
  actions: AlexAction[];
  quickIntents?: QuickIntent[];
}

export interface AlexAction {
  type: "show_auth_gate" | "show_property_form" | "show_quick_intents" | "start_voice" | "show_match" | "show_booking" | "create_watchlist";
  label: string;
  payload?: Record<string, unknown>;
}

export interface QuickIntent {
  label: string;
  icon: string;
  category: string;
}

const QUICK_INTENTS: QuickIntent[] = [
  { label: "Isolation grenier", icon: "🏠", category: "isolation" },
  { label: "Toiture", icon: "🏗️", category: "toiture" },
  { label: "Plomberie urgence", icon: "🚿", category: "plomberie" },
  { label: "Rénovation cuisine", icon: "🍳", category: "renovation_cuisine" },
  { label: "Électricité", icon: "⚡", category: "electricite" },
  { label: "Peinture", icon: "🎨", category: "peinture" },
];

/**
 * Resolve current Alex state based on context.
 * RULE: Alex never asks useless questions. Each question unlocks an action.
 */
export function resolveAlexState(ctx: AlexContext): StateResolution {
  // STATE 1: Not logged in
  if (!ctx.isAuthenticated || !ctx.userId) {
    return {
      state: "NOT_LOGGED",
      greeting: "Pour continuer, crée ton accès gratuit. Ça prend 10 secondes.",
      actions: [{ type: "show_auth_gate", label: "Créer mon accès" }],
    };
  }

  // STATE 2: Logged but no property
  if (!ctx.hasProperty) {
    return {
      state: "LOGGED_NO_PROPERTY",
      greeting: "Pour mieux vous aider, j'ai besoin de votre adresse.",
      actions: [{ type: "show_property_form", label: "Ajouter mon adresse" }],
    };
  }

  // STATE 3: No intent detected yet
  if (!ctx.intentDetected) {
    return {
      state: "CONTEXT_UNKNOWN",
      greeting: "Qu'est-ce qu'on fait aujourd'hui?",
      actions: [
        { type: "show_quick_intents", label: "Choisir un besoin" },
        { type: "start_voice", label: "Parler à Alex" },
      ],
      quickIntents: QUICK_INTENTS,
    };
  }

  // STATE: Match found
  if (ctx.matchedContractor) {
    if (ctx.bookingIntentId) {
      return {
        state: "BOOKING_READY",
        greeting: "J'ai trouvé la meilleure option. On bloque ça?",
        actions: [{ type: "show_booking", label: "Confirmer le rendez-vous", payload: { bookingId: ctx.bookingIntentId } }],
      };
    }
    return {
      state: "MATCH_FOUND",
      greeting: "Je te montre.",
      actions: [{ type: "show_match", label: "Voir le professionnel" }],
    };
  }

  // STATE 4: Intent defined, ready to match
  return {
    state: "CONTEXT_DEFINED",
    greeting: "Je m'en occupe.",
    actions: [{ type: "show_match", label: "Trouver un professionnel" }],
  };
}

/**
 * Get the voice system instruction based on current state.
 * Keeps it SHORT for Gemini Live (long instructions cause WebSocket close).
 */
export function getVoiceInstructionForState(state: AlexState, ctx: AlexContext): string {
  const base = "Tu es Alex, concierge IA vocale d'UnPRO.ca. Français québécois naturel. Phrases courtes, maximum 2 phrases. Une seule question à la fois. Jamais de markdown. Ton calme, posé, humain. Féminin : 'ravie', 'certaine', 'prête'.";
  
  switch (state) {
    case "CONTEXT_UNKNOWN":
      return `${base} L'utilisateur n'a pas encore dit ce qu'il veut. Demande-lui simplement son besoin. Ne propose PAS 3 soumissions. Ne dis jamais "quelqu'un va vous rappeler".`;
    case "CONTEXT_DEFINED":
      return `${base} L'utilisateur cherche: ${ctx.intentDetected}. Catégorie: ${ctx.category || "à déterminer"}. Pose UNE question ciblée si nécessaire: urgence, budget approximatif, ou référence visuelle. Sinon agis immédiatement.`;
    case "MATCH_FOUND":
      return `${base} Un professionnel a été trouvé. Présente-le brièvement et propose de bloquer un créneau. Dis "J'ai trouvé la meilleure option".`;
    case "NO_MATCH":
      return `${base} Aucun pro disponible pour ce niveau de qualité. Dis "Je surveille et je t'avertis." Propose de créer une alerte.`;
    default:
      return base;
  }
}

/**
 * MICROCOPY RULES — blocked phrases that Alex must never say.
 */
export const BLOCKED_PHRASES = [
  "Quel est votre problème",
  "Voulez-vous 3 soumissions",
  "Quelqu'un va vous rappeler",
  "on vous rappelle",
  "3 soumissions",
];

/**
 * REQUIRED PHRASES — Alex should prefer these.
 */
export const PREFERRED_PHRASES = [
  "Je m'en occupe.",
  "J'ai trouvé la meilleure option.",
  "Je te montre.",
  "On bloque ça?",
];
