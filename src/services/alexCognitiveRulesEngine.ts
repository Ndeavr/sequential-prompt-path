/**
 * AlexCognitiveRulesEngine — 8 strict rules pipeline for every Alex response.
 * 
 * RULE 1: Fast intent classification (problem/project/comparison/validation/estimation/urgency)
 * RULE 2: Structured 4-block answer (comprehension → useful answer → context → action)
 * RULE 3: No-repeat guard (check memory before asking)
 * RULE 4: Forward-only (every response must have a next-step)
 * RULE 5: Precision over length (word budget per block)
 * RULE 6: Expert tone (domain vocabulary)
 * RULE 7: Adaptive tone (urgency/hesitation)
 * RULE 8: Single question per turn
 */

import type { AlexSessionMemory } from "./alexMemoryEngine";

export type QuestionType = "problem" | "project" | "comparison" | "validation" | "estimation" | "urgency" | "general";

export interface CognitiveContext {
  questionType: QuestionType;
  hasMemory: boolean;
  knownFields: string[];
  missingFields: string[];
  urgencyLevel: "low" | "medium" | "high" | "emergency";
  userTone: "calm" | "stressed" | "hesitant" | "expert" | "novice";
}

export interface StructuredAnswer {
  comprehension: string;
  usefulAnswer: string;
  context: string | null;
  action: string;
  followUpSuggestions: string[];
  questionType: QuestionType;
  confidenceScore: number;
}

// ─── RULE 1: Question Type Classification ───
const QUESTION_TYPE_PATTERNS: Record<QuestionType, RegExp[]> = {
  problem: [/fuite/i, /brisé/i, /cassé/i, /urgent/i, /moisissure/i, /fissure/i, /dégât/i, /problème/i, /bruit/i, /odeur/i, /humidité/i, /inondation/i],
  project: [/rénovation/i, /cuisine/i, /salle de bain/i, /agrandir/i, /construire/i, /transformer/i, /aménager/i, /installer/i, /refaire/i, /moderniser/i],
  comparison: [/comparer/i, /différence/i, /meilleur/i, /versus/i, /vs/i, /lequel/i, /ou bien/i, /alternative/i],
  validation: [/vérifier/i, /normal/i, /est-ce que/i, /bon prix/i, /raisonnable/i, /confirmer/i, /valider/i, /fiable/i],
  estimation: [/combien/i, /prix/i, /coût/i, /budget/i, /estimer/i, /tarif/i, /cher/i, /investir/i],
  urgency: [/urgent/i, /immédiatement/i, /maintenant/i, /secours/i, /danger/i, /inondation/i, /feu/i, /gaz/i, /électrique/i],
  general: [],
};

export function classifyQuestionType(text: string): QuestionType {
  const lower = text.toLowerCase();
  // Priority: urgency first
  for (const type of ["urgency", "problem", "estimation", "comparison", "validation", "project"] as QuestionType[]) {
    if (QUESTION_TYPE_PATTERNS[type].some(p => p.test(lower))) return type;
  }
  return "general";
}

// ─── RULE 2: Structured Answer Builder helpers ───
const WORD_BUDGETS: Record<keyof Omit<StructuredAnswer, "followUpSuggestions" | "questionType" | "confidenceScore">, number> = {
  comprehension: 20,
  usefulAnswer: 40,
  context: 25,
  action: 15,
};

function trimToWordBudget(text: string, maxWords: number): string {
  const words = text.split(/\s+/);
  if (words.length <= maxWords) return text;
  return words.slice(0, maxWords).join(" ") + "…";
}

// ─── RULE 3: No-Repeat Guard ───
export function getRedundantFields(memory: AlexSessionMemory): string[] {
  const known: string[] = [];
  if (memory.city) known.push("city");
  if (memory.address_known) known.push("address");
  if (memory.service_category) known.push("service");
  if (memory.problem_type) known.push("problem");
  if (memory.need_qualified) known.push("need");
  if (memory.property_type) known.push("property_type");
  if (memory.urgency) known.push("urgency");
  return known;
}

export function getMissingFields(memory: AlexSessionMemory): string[] {
  const missing: string[] = [];
  if (!memory.need_qualified && !memory.problem_type) missing.push("problem");
  if (!memory.service_category) missing.push("service");
  if (!memory.city && !memory.address_known) missing.push("location");
  return missing;
}

// ─── RULE 7: User Tone Detection ───
const STRESS_PATTERNS = [/urgent/i, /vite/i, /maintenant/i, /secours/i, /panique/i, /help/i, /sos/i, /!!!/];
const HESITATION_PATTERNS = [/je sais pas/i, /peut-être/i, /hésit/i, /pas sûr/i, /pas certain/i, /incertain/i, /bof/i];
const EXPERT_PATTERNS = [/btuh/i, /r-value/i, /solin/i, /membrane/i, /polyuréthane/i, /giclé/i, /drain français/i];

export function detectUserTone(text: string): "calm" | "stressed" | "hesitant" | "expert" | "novice" {
  if (STRESS_PATTERNS.some(p => p.test(text))) return "stressed";
  if (HESITATION_PATTERNS.some(p => p.test(text))) return "hesitant";
  if (EXPERT_PATTERNS.some(p => p.test(text))) return "expert";
  if (text.length < 15) return "novice";
  return "calm";
}

// ─── RULE 8: Extract single question ───
function extractSingleQuestion(text: string): string {
  const questions = text.split(/[.!]\s*/).filter(s => s.includes("?"));
  return questions.length > 0 ? questions[0].trim() + " ?" : text;
}

// ─── MAIN PIPELINE ───
export function applyCognitiveRules(
  rawResponse: string,
  memory: AlexSessionMemory,
  userMessage: string,
): StructuredAnswer {
  const questionType = classifyQuestionType(userMessage);
  const knownFields = getRedundantFields(memory);
  const missingFields = getMissingFields(memory);
  const userTone = detectUserTone(userMessage);
  const confidenceScore = knownFields.length / (knownFields.length + missingFields.length) || 0.3;

  // Parse or create structured blocks from raw response
  const sentences = rawResponse.split(/(?<=[.!?])\s+/).filter(Boolean);
  
  const comprehension = trimToWordBudget(
    sentences[0] || "Je comprends votre demande.",
    WORD_BUDGETS.comprehension
  );
  
  const usefulAnswer = trimToWordBudget(
    sentences.slice(1, 3).join(" ") || rawResponse,
    WORD_BUDGETS.usefulAnswer
  );
  
  const contextBlock = memory.city
    ? trimToWordBudget(`Dans votre secteur de ${memory.city}, ce type d'intervention est courant.`, WORD_BUDGETS.context)
    : null;

  // RULE 4: Always include action
  let action = "Comment souhaitez-vous procéder ?";
  if (missingFields.includes("location")) {
    action = "Dans quelle ville se situe votre propriété ?";
  } else if (missingFields.includes("problem")) {
    action = "Quel est le problème principal ?";
  } else if (memory.need_qualified && memory.service_category && memory.city) {
    action = "Je peux vous trouver un professionnel disponible.";
  }

  // RULE 8: Ensure single question
  action = extractSingleQuestion(action);

  // Follow-up suggestions based on context
  const followUpSuggestions = generateFollowUpSuggestions(memory, questionType);

  return {
    comprehension,
    usefulAnswer,
    context: contextBlock,
    action,
    followUpSuggestions,
    questionType,
    confidenceScore,
  };
}

function generateFollowUpSuggestions(memory: AlexSessionMemory, questionType: QuestionType): string[] {
  const suggestions: string[] = [];

  if (!memory.has_photo && memory.problem_type) {
    suggestions.push("📷 Envoyer une photo");
  }
  if (memory.need_qualified && memory.service_category && !memory.recommended_contractor_id) {
    suggestions.push("🔍 Voir les professionnels");
  }
  if (memory.recommended_contractor_id && !memory.booking_confirmed) {
    suggestions.push("📅 Planifier un rendez-vous");
  }
  if (!memory.need_qualified) {
    suggestions.push("💡 Estimer le coût");
  }
  if (questionType === "comparison") {
    suggestions.push("📊 Comparer les options");
  }

  return suggestions.slice(0, 4);
}

// ─── TONE ADAPTER ───
export function adaptTone(text: string, tone: "calm" | "stressed" | "hesitant" | "expert" | "novice"): string {
  switch (tone) {
    case "stressed":
      return text.replace(/^/, "Je comprends l'urgence. ");
    case "hesitant":
      return text.replace(/^/, "Pas de souci, on y va étape par étape. ");
    case "expert":
      return text; // No softening needed
    case "novice":
      return text.replace(/\b(solin|membrane|giclé|R-value)\b/gi, (match) => `${match} (un élément technique)`);
    default:
      return text;
  }
}
