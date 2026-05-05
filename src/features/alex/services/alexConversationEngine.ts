/**
 * Alex 100M — Conversation Engine
 * Aligned with the official Alex System Prompt (FR-only, premium concierge).
 *
 * Rules:
 * - Français uniquement. Si l'utilisateur écrit en anglais → réponse de bascule unique.
 * - Réponses courtes, une question à la fois, pas de longs paragraphes.
 * - Suit la méthode : comprendre → piste claire → meilleure prochaine question.
 */

import type {
  AlexIntent,
  AlexLanguage,
  AlexUserRole,
  AlexConversationResponse,
} from "../types/alex.types";
import { classifyIntent } from "./alexIntentClassifier";
import { ENGLISH_FALLBACK } from "../utils/alexCopy";
import { alexLog } from "../utils/alexDebug";

// ─── Response templates (FR — canonical) ──────────────────────────

const RESPONSES_FR: Record<AlexIntent, string[]> = {
  homeowner_problem: [
    "Décrivez le problème en quelques mots — je vous oriente.",
    "Est-ce surtout de l'eau, du froid, une fissure ou autre chose?",
  ],
  photo_upload: [
    "Envoyez-moi une photo et je vais vous aider à comprendre.",
  ],
  quote_compare: [
    "Téléversez vos soumissions — j'identifie les écarts importants.",
  ],
  contractor_onboarding: [
    "Bienvenue. Pour vous aider, dites-moi votre métier principal.",
  ],
  booking: [
    "Quel jour vous convient le mieux pour le rendez-vous?",
  ],
  unknown: [
    "Décrivez en une phrase ce qui vous inquiète — je vous oriente.",
  ],
};

// ─── Domain-specific question patterns (per system prompt) ────────

const DOMAIN_QUESTIONS_FR: Array<{ keywords: string[]; question: string }> = [
  {
    keywords: ["humidit", "moisissure", "moisi", "condensation"],
    question: "C'est surtout au sous-sol, salle de bain ou partout?",
  },
  {
    keywords: ["toit", "toiture", "fuite toit", "bardeaux"],
    question: "C'est une fuite active ou un problème observé récemment?",
  },
  {
    keywords: ["isolation", "isolant", "froid", "courant d'air"],
    question: "La maison date de quelle année environ?",
  },
  {
    keywords: ["plomberie", "tuyau", "robinet", "drain", "fuite"],
    question: "L'eau coule moins bien ou il y a une fuite visible?",
  },
];

// ─── Upload acknowledgement ───────────────────────────────────────

const UPLOAD_ACK_FR = "Photo reçue. Je l'analyse maintenant.";

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─── English detection (basic) ────────────────────────────────────
// If the message is clearly English (no French diacritics + common EN words),
// reply with the canonical FR-only fallback line.
const EN_HINTS = /\b(the|and|hello|hi|help|please|water|leak|roof|need|how|what|why|window|door|cold|hot|mold|basement)\b/i;
const FR_HINTS = /[àâçéèêëîïôûùüÿœæ]|\b(le|la|les|un|une|des|je|j'|tu|vous|nous|est|c'est|bonjour|salut|aide|toiture|humidit|moisissure|fuite|froid|chaud|sous-sol)\b/i;

function looksEnglish(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (FR_HINTS.test(t)) return false;
  return EN_HINTS.test(t);
}

function findDomainQuestion(text: string): string | null {
  const lower = text.toLowerCase();
  for (const rule of DOMAIN_QUESTIONS_FR) {
    if (rule.keywords.some((kw) => lower.includes(kw))) {
      return rule.question;
    }
  }
  return null;
}

// ─── Visual project keywords ──────────────────────────────────────
const VISUAL_KEYWORDS = [
  "peinture", "peindre", "toiture", "toit", "façade", "facade",
  "cuisine", "salle de bain", "terrasse", "aménagement", "amenagement",
  "extérieur", "exterieur", "isolation", "infiltration", "moisissure",
  "fissure", "rénovation", "renovation", "moderniser", "modernisation",
  "avant après", "avant/après", "look", "style", "design", "couleur",
  "revêtement", "revetement", "patio", "balcon",
];

function detectVisualIntent(text: string): boolean {
  const lower = text.toLowerCase();
  return VISUAL_KEYWORDS.some((k) => lower.includes(k));
}

export function isVisualProjectMessage(text: string): boolean {
  return detectVisualIntent(text);
}

// ─── Engine ───────────────────────────────────────────────────────

export function processUserMessage(
  text: string,
  _lang: AlexLanguage,
  _role: AlexUserRole,
): AlexConversationResponse {
  // FR-only policy: if user wrote English, return canonical fallback.
  if (looksEnglish(text)) {
    alexLog("conversation:english_fallback");
    return { text: ENGLISH_FALLBACK, speak: true, intent: "unknown" };
  }

  // Visual project — Alex opens upload zone immediately.
  if (detectVisualIntent(text)) {
    alexLog("conversation:visual_intent");
    return {
      text: "Envoyez-moi une photo et je vais analyser l'espace pour vous proposer deux directions visuelles.",
      speak: true,
      intent: "photo_upload",
    };
  }

  const intent = classifyIntent(text);

  // Prefer a precise domain question when we detect a known topic.
  const domainQ = findDomainQuestion(text);
  if (domainQ) {
    alexLog("conversation:domain_question", { question: domainQ.slice(0, 60) });
    return { text: domainQ, speak: true, intent };
  }

  const reply = pick(RESPONSES_FR[intent] ?? RESPONSES_FR.unknown);
  alexLog("conversation:reply", { intent, reply: reply.slice(0, 60) });

  return { text: reply, speak: true, intent };
}

export function acknowledgeUpload(_lang: AlexLanguage): AlexConversationResponse {
  return { text: UPLOAD_ACK_FR, speak: true, intent: "photo_upload" };
}

export function handleQuickAction(
  actionKey: string,
  _lang: AlexLanguage,
  _role: AlexUserRole,
): AlexConversationResponse {
  const intent = actionKey as AlexIntent;
  const pool = RESPONSES_FR[intent] || RESPONSES_FR.unknown;
  const reply = pick(pool);

  alexLog("conversation:quickAction", { actionKey, reply: reply.slice(0, 60) });

  return { text: reply, speak: true, intent };
}
