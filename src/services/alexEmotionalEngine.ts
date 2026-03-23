/**
 * AlexEmotionalEngine — Detects user emotional state and adapts Alex's behavior.
 * Signals: stress, urgency, hesitation, budget sensitivity.
 */

export type EmotionalState =
  | "neutral"
  | "stressed"
  | "urgent"
  | "hesitant"
  | "budget_sensitive"
  | "confident"
  | "frustrated";

export interface EmotionalAnalysis {
  state: EmotionalState;
  confidence: number; // 0-1
  adaptations: {
    tone: "warm" | "reassuring" | "direct" | "empathetic";
    complexity: "simple" | "standard" | "detailed";
    speed: "slow" | "normal" | "fast";
    maxSentences: 1 | 2 | 3;
  };
}

const STRESS_KEYWORDS = [
  "urgence", "urgent", "coule", "inondation", "feu", "moisissure",
  "danger", "peur", "panique", "vite", "immédiat", "catastrophe",
  "dégât", "brisé", "cassé", "pire", "grave", "critique",
];

const HESITATION_KEYWORDS = [
  "peut-être", "je sais pas", "pas sûr", "hésite", "on verra",
  "éventuellement", "bof", "hmm", "euh", "pourquoi pas",
  "c'est cher", "trop", "budget",
];

const BUDGET_KEYWORDS = [
  "combien", "prix", "coût", "cher", "budget", "gratuit",
  "subvention", "rabais", "économiser", "argent", "payer",
];

const URGENCY_KEYWORDS = [
  "aujourd'hui", "maintenant", "tout de suite", "ce soir",
  "demain", "au plus vite", "asap", "rush", "24h",
];

function countMatches(text: string, keywords: string[]): number {
  const lower = text.toLowerCase();
  return keywords.filter((k) => lower.includes(k)).length;
}

export function analyzeEmotion(
  userText: string,
  conversationHistory?: string[]
): EmotionalAnalysis {
  const allText = [userText, ...(conversationHistory ?? [])].join(" ");
  const recent = userText;

  const stressScore = countMatches(recent, STRESS_KEYWORDS);
  const hesitationScore = countMatches(recent, HESITATION_KEYWORDS);
  const budgetScore = countMatches(recent, BUDGET_KEYWORDS);
  const urgencyScore = countMatches(recent, URGENCY_KEYWORDS);

  // Determine primary state
  let state: EmotionalState = "neutral";
  let confidence = 0.5;

  if (stressScore >= 2 || urgencyScore >= 2) {
    state = urgencyScore > stressScore ? "urgent" : "stressed";
    confidence = Math.min(0.95, 0.6 + stressScore * 0.1 + urgencyScore * 0.1);
  } else if (hesitationScore >= 2) {
    state = "hesitant";
    confidence = Math.min(0.9, 0.5 + hesitationScore * 0.1);
  } else if (budgetScore >= 2) {
    state = "budget_sensitive";
    confidence = Math.min(0.85, 0.5 + budgetScore * 0.1);
  } else if (recent.length > 100 && !recent.includes("?")) {
    state = "confident";
    confidence = 0.6;
  }

  // Check frustration (repeated questions, short angry messages)
  if (conversationHistory && conversationHistory.length > 4) {
    const repeats = conversationHistory.filter(
      (h) => h.toLowerCase().includes(recent.toLowerCase().slice(0, 20))
    ).length;
    if (repeats >= 2) {
      state = "frustrated";
      confidence = 0.8;
    }
  }

  return {
    state,
    confidence,
    adaptations: getAdaptations(state),
  };
}

function getAdaptations(state: EmotionalState): EmotionalAnalysis["adaptations"] {
  switch (state) {
    case "stressed":
      return { tone: "reassuring", complexity: "simple", speed: "slow", maxSentences: 2 };
    case "urgent":
      return { tone: "direct", complexity: "simple", speed: "fast", maxSentences: 1 };
    case "hesitant":
      return { tone: "warm", complexity: "simple", speed: "normal", maxSentences: 2 };
    case "budget_sensitive":
      return { tone: "empathetic", complexity: "standard", speed: "normal", maxSentences: 3 };
    case "frustrated":
      return { tone: "empathetic", complexity: "simple", speed: "normal", maxSentences: 1 };
    case "confident":
      return { tone: "direct", complexity: "detailed", speed: "fast", maxSentences: 3 };
    default:
      return { tone: "warm", complexity: "standard", speed: "normal", maxSentences: 3 };
  }
}
