/**
 * AlexConversationOrderEngine V3
 * 
 * Enforces strict conversation order:
 * 1. assess_problem → understand need before anything else
 * 2. check_auth → only after problem is understood
 * 3. complete_profile → only after auth, only missing fields
 * 4. request_address → only when operationally needed
 * 5. run_match → find contractor
 * 6. show_result → display match/booking
 * 7. fallback → if no match
 * 
 * RULES:
 * - Never ask city/address before problem assessment
 * - Never ask login before minimal understanding
 * - Resume exactly where left off after login
 * - One question at a time
 * - Never re-ask known info
 */

export type ConversationPhase =
  | "assess_problem"
  | "check_auth"
  | "complete_profile"
  | "request_address"
  | "run_match"
  | "show_result"
  | "fallback";

export interface ProblemAssessment {
  problemType: string | null;       // e.g. "infiltration", "rénovation"
  projectType: string | null;       // e.g. "toiture", "salle de bain"
  urgencyLevel: "unknown" | "low" | "medium" | "high" | "emergency";
  hasPhoto: boolean;
  hasQuote: boolean;
  summary: string | null;
  assessmentComplete: boolean;
  questionsAsked: number;
}

export interface UserContext {
  isAuthenticated: boolean;
  userId: string | null;
  firstName: string | null;
  email: string | null;
  hasAddress: boolean;
  city: string | null;
  profileComplete: boolean;
  missingFields: string[];
}

export interface ConversationFlowState {
  phase: ConversationPhase;
  problem: ProblemAssessment;
  userContext: UserContext;
  matchAttempted: boolean;
  matchFound: boolean;
  resumedAfterAuth: boolean;
  phaseBeforeAuth: ConversationPhase | null;
}

export function createInitialFlowState(userCtx?: Partial<UserContext>): ConversationFlowState {
  return {
    phase: "assess_problem",
    problem: {
      problemType: null,
      projectType: null,
      urgencyLevel: "unknown",
      hasPhoto: false,
      hasQuote: false,
      summary: null,
      assessmentComplete: false,
      questionsAsked: 0,
    },
    userContext: {
      isAuthenticated: false,
      userId: null,
      firstName: null,
      email: null,
      hasAddress: false,
      city: null,
      profileComplete: false,
      missingFields: ["first_name", "phone"],
      ...userCtx,
    },
    matchAttempted: false,
    matchFound: false,
    resumedAfterAuth: false,
    phaseBeforeAuth: null,
  };
}

// ─── Problem Detection ───

const PROBLEM_KEYWORDS: Record<string, { type: string; project: string; urgency: "low" | "medium" | "high" | "emergency" }> = {
  "infiltration": { type: "diagnostic", project: "toiture", urgency: "high" },
  "fuite": { type: "urgence", project: "plomberie", urgency: "emergency" },
  "moisissure": { type: "diagnostic", project: "ventilation", urgency: "high" },
  "fissure": { type: "diagnostic", project: "fondation", urgency: "medium" },
  "toiture": { type: "réparation", project: "toiture", urgency: "medium" },
  "toit": { type: "réparation", project: "toiture", urgency: "medium" },
  "plomberie": { type: "réparation", project: "plomberie", urgency: "medium" },
  "plombier": { type: "réparation", project: "plomberie", urgency: "medium" },
  "électricité": { type: "réparation", project: "électricité", urgency: "medium" },
  "électricien": { type: "réparation", project: "électricité", urgency: "medium" },
  "rénovation": { type: "projet", project: "rénovation", urgency: "low" },
  "salle de bain": { type: "projet", project: "salle de bain", urgency: "low" },
  "cuisine": { type: "projet", project: "cuisine", urgency: "low" },
  "peinture": { type: "projet", project: "peinture", urgency: "low" },
  "isolation": { type: "projet", project: "isolation", urgency: "low" },
  "chauffage": { type: "réparation", project: "chauffage", urgency: "medium" },
  "climatisation": { type: "réparation", project: "climatisation", urgency: "medium" },
  "fenêtre": { type: "projet", project: "fenêtres", urgency: "low" },
  "plancher": { type: "projet", project: "plancher", urgency: "low" },
  "urgent": { type: "urgence", project: "général", urgency: "emergency" },
  "urgence": { type: "urgence", project: "général", urgency: "emergency" },
  "design": { type: "inspiration", project: "design", urgency: "low" },
  "décoration": { type: "inspiration", project: "décoration", urgency: "low" },
  "soumission": { type: "analyse", project: "soumission", urgency: "low" },
  "devis": { type: "analyse", project: "devis", urgency: "low" },
};

const URGENCY_KEYWORDS = ["urgent", "urgence", "fuite", "dégât", "inondation", "immédiat", "maintenant", "vite"];

export function detectProblemFromText(text: string): Partial<ProblemAssessment> | null {
  const lower = text.toLowerCase();
  
  for (const [kw, info] of Object.entries(PROBLEM_KEYWORDS)) {
    if (lower.includes(kw)) {
      const isUrgent = URGENCY_KEYWORDS.some(u => lower.includes(u));
      return {
        problemType: info.type,
        projectType: info.project,
        urgencyLevel: isUrgent ? "emergency" : info.urgency,
        summary: text.trim(),
      };
    }
  }
  
  // If text is long enough but no keyword matched, still count as partial assessment
  if (text.trim().length > 15) {
    return {
      problemType: "autre",
      projectType: null,
      summary: text.trim(),
      urgencyLevel: "unknown",
    };
  }
  
  return null;
}

// ─── Phase Resolver ───

export function resolveNextPhase(state: ConversationFlowState): ConversationPhase {
  const { problem, userContext } = state;

  // Phase 1: Always assess problem first
  if (!problem.assessmentComplete) return "assess_problem";

  // Phase 2: Check auth after problem is understood
  if (!userContext.isAuthenticated) return "check_auth";

  // Phase 3: Complete profile if needed
  if (!userContext.profileComplete && userContext.missingFields.length > 0) return "complete_profile";

  // Phase 4: Address only when operationally needed for match
  if (!userContext.hasAddress && needsAddressForAction(problem)) return "request_address";

  // Phase 5+: Match
  if (!state.matchAttempted) return "run_match";

  if (state.matchFound) return "show_result";

  return "fallback";
}

function needsAddressForAction(problem: ProblemAssessment): boolean {
  // Analysis-only intents don't need address
  const noAddressNeeded = ["analyse", "inspiration"];
  if (problem.problemType && noAddressNeeded.includes(problem.problemType)) return false;
  return true;
}

// ─── Response Generator ───

export interface FlowResponse {
  alexMessage: string;
  cardType?: string;
  cardData?: any;
  nextPhase: ConversationPhase;
  shouldWaitForInput: boolean;
}

export function generatePhaseResponse(state: ConversationFlowState): FlowResponse {
  const phase = resolveNextPhase(state);
  const { problem, userContext } = state;

  switch (phase) {
    case "assess_problem": {
      if (problem.questionsAsked === 0) {
        const greeting = userContext.firstName
          ? `Bonjour ${userContext.firstName}. Décrivez-moi votre besoin, je m'en occupe.`
          : "Bonjour. Je suis Alex, votre assistante UNPRO. Décrivez-moi votre besoin, je m'en occupe.";
        return { alexMessage: greeting, nextPhase: phase, shouldWaitForInput: true };
      }
      if (problem.problemType && !problem.projectType) {
        return { alexMessage: "De quel type de travaux s'agit-il exactement ?", nextPhase: phase, shouldWaitForInput: true };
      }
      if (problem.urgencyLevel === "unknown") {
        return { alexMessage: "Est-ce un problème urgent ou un projet planifié ?", nextPhase: phase, shouldWaitForInput: true };
      }
      // Enough info, promote to next phase
      return { alexMessage: `Compris. ${problem.summary || "Je note votre besoin."}`, nextPhase: "check_auth", shouldWaitForInput: false };
    }

    case "check_auth": {
      if (userContext.isAuthenticated) {
        return { alexMessage: "", nextPhase: resolveNextPhase({ ...state, phase: "complete_profile" }), shouldWaitForInput: false };
      }
      return {
        alexMessage: "Pour continuer et sauvegarder votre dossier, connectez-vous ou créez votre compte gratuit.",
        cardType: "login_prompt",
        nextPhase: phase,
        shouldWaitForInput: true,
      };
    }

    case "complete_profile": {
      const missing = userContext.missingFields[0];
      if (missing === "first_name") {
        return { alexMessage: "Pour personnaliser votre expérience, quel est votre prénom ?", nextPhase: phase, shouldWaitForInput: true };
      }
      if (missing === "phone") {
        return {
          alexMessage: "Il me manque quelques informations pour mieux vous servir.",
          cardType: "profile_completion",
          nextPhase: phase,
          shouldWaitForInput: true,
        };
      }
      return { alexMessage: "", nextPhase: "request_address", shouldWaitForInput: false };
    }

    case "request_address": {
      return {
        alexMessage: "Il me manque votre adresse pour chercher les meilleurs entrepreneurs près de chez vous.",
        cardType: "address_required",
        nextPhase: phase,
        shouldWaitForInput: true,
      };
    }

    case "run_match": {
      return {
        alexMessage: "Je m'en occupe. Je cherche le meilleur professionnel pour vous.",
        nextPhase: "show_result",
        shouldWaitForInput: false,
      };
    }

    case "show_result": {
      return {
        alexMessage: "J'ai trouvé la meilleure option. Voici le professionnel recommandé.",
        cardType: "entrepreneur",
        nextPhase: phase,
        shouldWaitForInput: true,
      };
    }

    case "fallback": {
      return {
        alexMessage: "Aucun professionnel disponible pour le moment. Je surveille et je vous avertis dès qu'un match est trouvé.",
        cardType: "no_match",
        nextPhase: phase,
        shouldWaitForInput: true,
      };
    }
  }
}

// ─── Guardrails ───

export function isQuestionBlocked(question: string, state: ConversationFlowState): boolean {
  const lower = question.toLowerCase();
  
  // Block city/address questions before problem assessment
  if (!state.problem.assessmentComplete) {
    const cityPatterns = ["ville", "adresse", "où habitez", "votre secteur", "code postal", "quel quartier"];
    if (cityPatterns.some(p => lower.includes(p))) return true;
  }
  
  // Block login prompts before minimal understanding
  if (state.problem.questionsAsked < 1) {
    const loginPatterns = ["connectez-vous", "créer un compte", "inscription"];
    if (loginPatterns.some(p => lower.includes(p))) return true;
  }
  
  return false;
}

// ─── Assessment completeness check ───

export function isProblemAssessmentComplete(problem: ProblemAssessment): boolean {
  // Complete if we have at least problem type OR enough questions asked
  if (problem.problemType && (problem.urgencyLevel !== "unknown" || problem.questionsAsked >= 2)) {
    return true;
  }
  // Also complete if we asked 3+ questions regardless
  if (problem.questionsAsked >= 3) return true;
  // Complete if we have photo or quote
  if (problem.hasPhoto || problem.hasQuote) return true;
  return false;
}
