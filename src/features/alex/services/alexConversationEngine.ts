/**
 * Alex 100M — Conversation Engine
 * Minimal, premium assistant responses.
 * One question at a time. Short. Sharp. Warm.
 */

import type {
  AlexIntent,
  AlexLanguage,
  AlexUserRole,
  AlexConversationResponse,
} from "../types/alex.types";
import { classifyIntent } from "./alexIntentClassifier";
import { alexLog } from "../utils/alexDebug";

// ─── Response templates ───────────────────────────────────────────

const RESPONSES_FR: Record<AlexIntent, string[]> = {
  homeowner_problem: [
    "Décrivez le problème — je vous guide.",
    "Quel type de problème? Fuite, froid, humidité?",
    "On identifie ça ensemble. Précisez la zone touchée.",
  ],
  photo_upload: [
    "Envoyez la photo — j'analyse immédiatement.",
    "Téléversez ici. J'identifie le problème.",
  ],
  quote_compare: [
    "Combien de soumissions avez-vous?",
    "Téléversez vos soumissions. Je compare instantanément.",
  ],
  contractor_onboarding: [
    "Bienvenue. Quel est votre métier?",
    "Entrepreneur? Parfait. Dans quelle ville exercez-vous?",
  ],
  booking: [
    "Je vérifie les disponibilités. Quel secteur?",
    "On planifie ça. Quel créneau vous convient?",
  ],
  unknown: [
    "Je vous écoute. Décrivez votre besoin.",
    "Précisez votre demande — je m'en occupe.",
  ],
};

const RESPONSES_EN: Record<AlexIntent, string[]> = {
  homeowner_problem: [
    "Describe the issue — I'll guide you.",
    "What kind of problem? Leak, cold, humidity?",
  ],
  photo_upload: [
    "Send the photo — I'll analyze it immediately.",
    "Upload here. I'll identify the issue.",
  ],
  quote_compare: [
    "How many quotes do you have?",
    "Upload your quotes. I'll compare instantly.",
  ],
  contractor_onboarding: [
    "Welcome. What's your trade?",
    "Contractor? Great. Which city do you operate in?",
  ],
  booking: [
    "Let me check availability. Which area?",
    "Let's schedule this. What time works for you?",
  ],
  unknown: [
    "I'm listening. Describe what you need.",
    "Tell me more — I'll handle it.",
  ],
};

// ─── Upload acknowledgement ───────────────────────────────────────

const UPLOAD_ACK_FR = [
  "Reçu. J'analyse la photo.",
  "Photo reçue — je regarde ça.",
];
const UPLOAD_ACK_EN = [
  "Got it. Analyzing the photo.",
  "Photo received — looking at it now.",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─── Engine ───────────────────────────────────────────────────────

export function processUserMessage(
  text: string,
  lang: AlexLanguage,
  _role: AlexUserRole,
): AlexConversationResponse {
  const intent = classifyIntent(text);
  const responses = lang === "fr-CA" ? RESPONSES_FR : RESPONSES_EN;
  const reply = pick(responses[intent]);

  alexLog("conversation:reply", { intent, reply: reply.slice(0, 60) });

  return {
    text: reply,
    speak: true,
    intent,
  };
}

export function acknowledgeUpload(lang: AlexLanguage): AlexConversationResponse {
  const text = pick(lang === "fr-CA" ? UPLOAD_ACK_FR : UPLOAD_ACK_EN);
  return { text, speak: true, intent: "photo_upload" };
}

export function handleQuickAction(
  actionKey: string,
  lang: AlexLanguage,
  _role: AlexUserRole,
): AlexConversationResponse {
  const intent = actionKey as AlexIntent;
  const responses = lang === "fr-CA" ? RESPONSES_FR : RESPONSES_EN;
  const pool = responses[intent] || responses.unknown;
  const reply = pick(pool);

  alexLog("conversation:quickAction", { actionKey, reply: reply.slice(0, 60) });

  return { text: reply, speak: true, intent };
}
