/**
 * Alex 100M — Intent Classifier
 * Deterministic keyword-based first pass. Fast, no API call.
 */

import type { AlexIntent } from "../types/alex.types";
import { alexLog } from "../utils/alexDebug";

interface IntentRule {
  intent: AlexIntent;
  keywords: string[];
}

const RULES: IntentRule[] = [
  {
    intent: "photo_upload",
    keywords: [
      "photo", "image", "picture", "envoyer", "téléverser", "upload",
      "montrer", "voir", "show", "send",
    ],
  },
  {
    intent: "quote_compare",
    keywords: [
      "soumission", "quote", "devis", "comparer", "compare", "estimation",
      "prix", "price", "combien", "how much", "cost",
    ],
  },
  {
    intent: "booking",
    keywords: [
      "rendez-vous", "appointment", "réserver", "book", "planifier",
      "schedule", "disponible", "available", "quand", "when",
    ],
  },
  {
    intent: "contractor_onboarding",
    keywords: [
      "entrepreneur", "contractor", "couvreur", "plombier", "électricien",
      "mon entreprise", "my business", "m'inscrire", "sign up", "join",
      "je suis pro", "je suis un pro",
    ],
  },
  {
    intent: "homeowner_problem",
    keywords: [
      "problème", "problem", "fuite", "leak", "moisissure", "mold",
      "froid", "cold", "chaud", "hot", "humidité", "humidity",
      "toit", "roof", "fenêtre", "window", "sous-sol", "basement",
      "fissure", "crack", "bruit", "noise", "urgent", "urgence",
      "inondation", "flood", "dégât", "damage",
    ],
  },
];

export function classifyIntent(text: string): AlexIntent {
  const lower = text.toLowerCase();

  for (const rule of RULES) {
    const match = rule.keywords.some((kw) => lower.includes(kw));
    if (match) {
      alexLog("intent:classified", { intent: rule.intent, text: text.slice(0, 60) });
      return rule.intent;
    }
  }

  alexLog("intent:unknown", { text: text.slice(0, 60) });
  return "unknown";
}
