/**
 * AlexContextResolver — Consolidates context from 4 sources into a single object.
 * 
 * Sources:
 * 1. Current message
 * 2. Conversation history (last 10 turns)
 * 3. User memory (persistent)
 * 4. Implicit signals (time of day, device, page origin)
 */

import type { AlexSessionMemory } from "./alexMemoryEngine";
import type { ConversationMessage } from "@/components/alex-conversation/types";

export interface ResolvedContext {
  // From current message
  currentMessage: string;
  detectedService: string | null;
  detectedCity: string | null;
  detectedProblem: string | null;
  detectedUrgency: "low" | "medium" | "high" | "emergency" | null;

  // From history
  turnCount: number;
  lastAlexQuestion: string | null;
  topicsDiscussed: string[];
  hasAskedForPhoto: boolean;
  hasAskedForLocation: boolean;

  // From memory
  knownCity: string | null;
  knownService: string | null;
  knownProblem: string | null;
  knownPropertyType: string | null;
  isNeedQualified: boolean;
  hasContractorMatch: boolean;

  // Implicit
  timeOfDay: "morning" | "afternoon" | "evening" | "night";
  locale: string;
  entryPage: string | null;
  intentFromUrl: string | null;

  // Computed
  confidenceLevel: number;
  suggestedNextAction: string;
  shouldAskPhoto: boolean;
  shouldAskLocation: boolean;
  shouldRecommend: boolean;
}

// ─── TIME DETECTION ───
function getTimeOfDay(): "morning" | "afternoon" | "evening" | "night" {
  const hour = new Date().getHours();
  if (hour < 6) return "night";
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

// ─── HISTORY ANALYSIS ───
function analyzeHistory(messages: ConversationMessage[]): {
  turnCount: number;
  lastAlexQuestion: string | null;
  topicsDiscussed: string[];
  hasAskedForPhoto: boolean;
  hasAskedForLocation: boolean;
} {
  const last10 = messages.slice(-20); // 10 turns = ~20 messages
  const alexMessages = last10.filter(m => m.role === "alex");
  const lastAlexMsg = alexMessages[alexMessages.length - 1];

  const topics: string[] = [];
  const photoAsked = alexMessages.some(m =>
    /photo|image|téléverser|upload/i.test(m.content)
  );
  const locationAsked = alexMessages.some(m =>
    /ville|secteur|adresse|où.*situe/i.test(m.content)
  );

  // Extract discussed topics
  for (const msg of last10) {
    if (/toiture|toit|couvreur/i.test(msg.content)) topics.push("toiture");
    if (/plomberie|plombier|fuite/i.test(msg.content)) topics.push("plomberie");
    if (/isolation|entretoit/i.test(msg.content)) topics.push("isolation");
    if (/cuisine|salle de bain/i.test(msg.content)) topics.push("renovation");
    if (/électri/i.test(msg.content)) topics.push("electricite");
  }

  return {
    turnCount: Math.floor(last10.length / 2),
    lastAlexQuestion: lastAlexMsg?.content.includes("?") ? lastAlexMsg.content : null,
    topicsDiscussed: [...new Set(topics)],
    hasAskedForPhoto: photoAsked,
    hasAskedForLocation: locationAsked,
  };
}

// ─── QUICK DETECTION HELPERS ───
const SERVICE_MAP: Record<string, string> = {
  "plomberie": "Plombier", "plombier": "Plombier", "fuite": "Plombier",
  "toiture": "Couvreur", "toit": "Couvreur", "couvreur": "Couvreur",
  "isolation": "Isolation", "entretoit": "Isolation",
  "électricité": "Électricien", "électricien": "Électricien",
  "cuisine": "Rénovation cuisine", "salle de bain": "Rénovation salle de bain",
  "peinture": "Peintre", "fondation": "Fondation",
  "chauffage": "Chauffagiste", "fenêtre": "Portes et fenêtres",
};

const CITIES = [
  "montréal", "montreal", "laval", "québec", "quebec", "gatineau",
  "sherbrooke", "longueuil", "lévis", "trois-rivières", "drummondville",
  "saint-jean", "rimouski", "saguenay", "terrebonne", "repentigny",
  "brossard", "saint-jérôme", "granby", "mascouche", "rosemont",
  "verdun", "lasalle", "anjou", "ahuntsic", "hochelaga",
];

function detectServiceFromText(text: string): string | null {
  const lower = text.toLowerCase();
  for (const [kw, svc] of Object.entries(SERVICE_MAP)) {
    if (lower.includes(kw)) return svc;
  }
  return null;
}

function detectCityFromText(text: string): string | null {
  const lower = text.toLowerCase();
  return CITIES.find(c => lower.includes(c)) || null;
}

const URGENCY_KEYWORDS: Record<string, "emergency" | "high" | "medium"> = {
  "inondation": "emergency", "feu": "emergency", "gaz": "emergency",
  "urgent": "high", "fuite": "high", "moisissure": "high",
  "fissure": "medium", "bruit": "medium",
};

function detectUrgency(text: string): "low" | "medium" | "high" | "emergency" | null {
  const lower = text.toLowerCase();
  for (const [kw, level] of Object.entries(URGENCY_KEYWORDS)) {
    if (lower.includes(kw)) return level;
  }
  return null;
}

// ─── MAIN RESOLVER ───
export function resolveContext(
  currentMessage: string,
  conversationHistory: ConversationMessage[],
  memory: AlexSessionMemory,
  options?: { entryPage?: string; intentFromUrl?: string },
): ResolvedContext {
  const history = analyzeHistory(conversationHistory);
  const detectedService = detectServiceFromText(currentMessage);
  const detectedCity = detectCityFromText(currentMessage);
  const detectedUrgency = detectUrgency(currentMessage);

  const knownCity = memory.city || detectedCity;
  const knownService = memory.service_category || detectedService;
  const isNeedQualified = memory.need_qualified || !!(knownService && (memory.problem_type || detectedService));

  // Compute confidence
  let confidence = 0.2;
  if (knownService) confidence += 0.25;
  if (knownCity) confidence += 0.15;
  if (memory.problem_type) confidence += 0.2;
  if (isNeedQualified) confidence += 0.2;

  // Determine next action
  let suggestedNextAction = "ask_problem";
  if (isNeedQualified && knownCity && knownService) {
    suggestedNextAction = "recommend_contractor";
  } else if (isNeedQualified && !knownCity) {
    suggestedNextAction = "ask_location";
  } else if (!isNeedQualified && knownService) {
    suggestedNextAction = "qualify_need";
  }

  // Photo logic
  const shouldAskPhoto = !memory.has_photo &&
    !history.hasAskedForPhoto &&
    !!memory.problem_type &&
    ["infiltration", "moisissure", "fissure", "barrage_glace", "toiture", "fondation"].includes(memory.problem_type);

  return {
    currentMessage,
    detectedService,
    detectedCity,
    detectedProblem: memory.problem_type,
    detectedUrgency,
    ...history,
    knownCity,
    knownService,
    knownProblem: memory.problem_type,
    knownPropertyType: memory.property_type,
    isNeedQualified,
    hasContractorMatch: !!memory.recommended_contractor_id,
    timeOfDay: getTimeOfDay(),
    locale: "fr-CA",
    entryPage: options?.entryPage || null,
    intentFromUrl: options?.intentFromUrl || null,
    confidenceLevel: Math.min(confidence, 1),
    suggestedNextAction,
    shouldAskPhoto,
    shouldAskLocation: !knownCity && !history.hasAskedForLocation,
    shouldRecommend: isNeedQualified && !!knownCity && !!knownService && !memory.recommended_contractor_id,
  };
}
