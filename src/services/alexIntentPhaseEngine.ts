/**
 * UNPRO — Alex Intent Phase Engine
 * Manages conversation phases and gates actions to prevent contextual inconsistency.
 * 
 * Phases: diagnostic → analyse → match → conversion
 * Each phase has allowed/blocked actions. No future-phase actions leak through.
 */

import type { AlexIntent } from "./alexIntentService";

export type IntentPhase = "diagnostic" | "analyse" | "match" | "conversion";

export interface IntentSession {
  id: string;
  detectedIntent: AlexIntent;
  currentPhase: IntentPhase;
  contextObject: string | null; // moisissure, toiture, cuisine, etc.
  messageCount: number;
  phaseHistory: IntentPhase[];
}

export type ActionKey =
  | "upload_photo"
  | "answer_questions"
  | "describe_more"
  | "view_estimation"
  | "view_recommendations"
  | "continue_discussion"
  | "search_contractor"
  | "view_profiles"
  | "request_quote"
  | "book_appointment"
  | "add_property"
  | "view_home_score"
  | "view_quotes";

export interface PhaseAction {
  key: ActionKey;
  title: string;
  description: string;
  icon: "search" | "upload" | "calendar" | "home" | "chart" | "star" | "message";
  ctaLink: string;
  phase: IntentPhase;
}

// ─── Phase Rules ───
const PHASE_ALLOWED_ACTIONS: Record<IntentPhase, ActionKey[]> = {
  diagnostic: ["upload_photo", "answer_questions", "describe_more", "continue_discussion"],
  analyse: ["view_estimation", "view_recommendations", "continue_discussion", "upload_photo"],
  match: ["search_contractor", "view_profiles", "continue_discussion"],
  conversion: ["request_quote", "book_appointment", "search_contractor"],
};

// ─── Action Definitions ───
const ACTION_REGISTRY: Record<ActionKey, Omit<PhaseAction, "phase">> = {
  upload_photo: {
    key: "upload_photo",
    title: "Téléverser une photo",
    description: "Envoyez une photo pour aider Alex à mieux comprendre.",
    icon: "upload",
    ctaLink: "#photo",
  },
  answer_questions: {
    key: "answer_questions",
    title: "Répondre aux questions",
    description: "Alex vous guide étape par étape.",
    icon: "message",
    ctaLink: "#",
  },
  describe_more: {
    key: "describe_more",
    title: "Décrire la situation",
    description: "Donnez plus de détails pour un meilleur diagnostic.",
    icon: "message",
    ctaLink: "#",
  },
  continue_discussion: {
    key: "continue_discussion",
    title: "Continuer la discussion",
    description: "Alex peut approfondir avec vous.",
    icon: "message",
    ctaLink: "#",
  },
  view_estimation: {
    key: "view_estimation",
    title: "Voir l'estimation",
    description: "Consultez une estimation de coûts pour votre situation.",
    icon: "chart",
    ctaLink: "/describe-project",
  },
  view_recommendations: {
    key: "view_recommendations",
    title: "Voir les recommandations",
    description: "Options et solutions recommandées par Alex.",
    icon: "star",
    ctaLink: "#",
  },
  search_contractor: {
    key: "search_contractor",
    title: "Rechercher un professionnel",
    description: "Trouvez l'entrepreneur adapté à votre projet.",
    icon: "search",
    ctaLink: "/search",
  },
  view_profiles: {
    key: "view_profiles",
    title: "Voir les profils recommandés",
    description: "Entrepreneurs compatibles avec votre besoin.",
    icon: "search",
    ctaLink: "/search",
  },
  request_quote: {
    key: "request_quote",
    title: "Demander une soumission",
    description: "Obtenez une soumission d'un professionnel vérifié.",
    icon: "upload",
    ctaLink: "/dashboard/quotes/upload",
  },
  book_appointment: {
    key: "book_appointment",
    title: "Prendre rendez-vous",
    description: "Planifiez un rendez-vous avec un entrepreneur.",
    icon: "calendar",
    ctaLink: "/search",
  },
  add_property: {
    key: "add_property",
    title: "Ajouter votre propriété",
    description: "Pour des recommandations personnalisées.",
    icon: "home",
    ctaLink: "/dashboard/properties/new",
  },
  view_home_score: {
    key: "view_home_score",
    title: "Score Maison",
    description: "Vérifiez l'état général de votre propriété.",
    icon: "chart",
    ctaLink: "/dashboard/home-score",
  },
  view_quotes: {
    key: "view_quotes",
    title: "Voir mes soumissions",
    description: "Consultez vos soumissions analysées.",
    icon: "chart",
    ctaLink: "/dashboard/quotes",
  },
};

// ─── Intent → Initial Phase Mapping ───
const INTENT_INITIAL_PHASE: Record<AlexIntent, IntentPhase> = {
  describe_project: "diagnostic",
  find_contractor: "match",
  analyze_quote: "conversion",
  book_appointment: "conversion",
  home_maintenance: "diagnostic",
  property_improvement: "diagnostic",
  general: "diagnostic",
};

// ─── Context detection from messages ───
const CONTEXT_KEYWORDS: Record<string, string[]> = {
  moisissure: ["moisissure", "mold", "moisi", "champignon"],
  humidite: ["humidité", "humide", "eau", "infiltration", "fuite"],
  toiture: ["toit", "toiture", "bardeaux", "gouttière", "glaçon"],
  fondation: ["fondation", "fissure", "sous-sol", "drain"],
  plomberie: ["plombier", "plomberie", "tuyau", "drain", "robinet"],
  cuisine: ["cuisine", "comptoir", "armoire", "îlot"],
  salle_de_bain: ["salle de bain", "douche", "bain", "vanité"],
  fenetre: ["fenêtre", "vitre", "châssis", "porte"],
  facade: ["façade", "revêtement", "parement", "siding"],
  electricite: ["électricité", "filage", "panneau", "prise"],
  chauffage: ["chauffage", "thermopompe", "fournaise", "ventilation"],
};

export function detectContextObject(message: string): string | null {
  const lower = message.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  let best: string | null = null;
  let bestScore = 0;

  for (const [ctx, keywords] of Object.entries(CONTEXT_KEYWORDS)) {
    let score = 0;
    for (const kw of keywords) {
      const norm = kw.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (lower.includes(norm)) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      best = ctx;
    }
  }
  return best;
}

// ─── Session Manager ───
let currentSession: IntentSession | null = null;

export function createIntentSession(intent: AlexIntent, firstMessage: string): IntentSession {
  const phase = INTENT_INITIAL_PHASE[intent];
  currentSession = {
    id: crypto.randomUUID(),
    detectedIntent: intent,
    currentPhase: phase,
    contextObject: detectContextObject(firstMessage),
    messageCount: 1,
    phaseHistory: [phase],
  };
  return currentSession;
}

export function getIntentSession(): IntentSession | null {
  return currentSession;
}

export function resetIntentSession(): void {
  currentSession = null;
}

export function advancePhase(session: IntentSession): IntentSession {
  const order: IntentPhase[] = ["diagnostic", "analyse", "match", "conversion"];
  const idx = order.indexOf(session.currentPhase);
  if (idx < order.length - 1) {
    session.currentPhase = order[idx + 1];
    session.phaseHistory.push(session.currentPhase);
  }
  return session;
}

export function incrementMessageCount(session: IntentSession): IntentSession {
  session.messageCount++;
  return session;
}

/**
 * Determines if the phase should auto-advance based on message count heuristic.
 * After enough exchanges in diagnostic, move to analyse, etc.
 */
export function shouldAutoAdvance(session: IntentSession): boolean {
  const thresholds: Record<IntentPhase, number> = {
    diagnostic: 3,
    analyse: 2,
    match: 2,
    conversion: 999, // never auto-advance past conversion
  };
  return session.messageCount >= (thresholds[session.currentPhase] ?? 999);
}

// ─── Phase-Gated Recommendations ───
export function getPhaseGatedActions(
  session: IntentSession,
  context?: { category?: string | null; hasProperties?: boolean }
): PhaseAction[] {
  const allowed = PHASE_ALLOWED_ACTIONS[session.currentPhase];
  
  // Filter to non-conversational actions (skip "answer_questions", "describe_more", "continue_discussion")
  const conversationalKeys: ActionKey[] = ["answer_questions", "describe_more", "continue_discussion"];
  const actionableKeys = allowed.filter(k => !conversationalKeys.includes(k));

  const actions: PhaseAction[] = actionableKeys.map(key => {
    const def = { ...ACTION_REGISTRY[key], phase: session.currentPhase };
    
    // Customize link with category if available
    if (key === "search_contractor" && context?.category) {
      def.ctaLink = `/search?specialty=${context.category}`;
    }
    
    return def;
  });

  return actions;
}

/**
 * Get phase-appropriate label for the actions section header
 */
export function getPhaseLabel(phase: IntentPhase): string {
  const labels: Record<IntentPhase, string> = {
    diagnostic: "Pour mieux comprendre",
    analyse: "Analyse et recommandations",
    match: "Trouver le bon pro",
    conversion: "Actions suggérées",
  };
  return labels[phase];
}

/**
 * Convert PhaseAction to the legacy AlexRecommendation format for backward compatibility
 */
export function phaseActionsToRecommendations(actions: PhaseAction[]) {
  return actions.map(a => ({
    title: a.title,
    description: a.description,
    ctaLabel: a.title,
    ctaLink: a.ctaLink,
    icon: a.icon === "message" ? "search" as const : a.icon,
  }));
}
