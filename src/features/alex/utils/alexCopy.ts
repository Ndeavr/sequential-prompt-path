/**
 * Alex 100M — Copy / Microcopy
 * French-first. English fallback. Premium tone.
 *
 * FORBIDDEN automatic prompts (never inject these):
 * - "Êtes-vous là ?"
 * - "Avez-vous toujours besoin de moi ?"
 * - "Êtes-vous encore là ?"
 * - "Are you still there?"
 * - "Hello?"
 */

import type { AlexLanguage, AlexUserRole } from "../types/alex.types";

// ─── Greetings (first visit) ──────────────────────────────────────
const GREETINGS_FR = [
  "Bonjour. Quel projet avance aujourd'hui?",
  "Bonjour. Décrivez votre besoin — on s'en occupe.",
  "Bonjour. Comment puis-je vous aider concrètement?",
] as const;

const GREETINGS_EN = [
  "Hi. What project are we working on today?",
  "Hello. Tell me what you need — let's get it done.",
  "Hi. How can I help you right now?",
] as const;

// ─── Restored session greetings ───────────────────────────────────
const RESTORED_FR = [
  "On reprend là où on était.",
  "Je me souviens. On continue?",
  "Rebonjour. Votre projet est toujours là.",
] as const;

const RESTORED_EN = [
  "Picking up where we left off.",
  "I remember. Shall we continue?",
  "Welcome back. Your project is still here.",
] as const;

// ─── Soft prompts (visual only, no audio) ─────────────────────────
const SOFT_PROMPTS_FR = [
  "Je suis là quand vous êtes prêt.",
  "Prenez votre temps.",
] as const;

const SOFT_PROMPTS_EN = [
  "I'm here whenever you're ready.",
  "Take your time.",
] as const;

// ─── Fallback text mode ───────────────────────────────────────────
const FALLBACK_TEXT_FR = "Le micro n'est pas disponible. Écrivez votre message.";
const FALLBACK_TEXT_EN = "Microphone unavailable. Type your message instead.";

// ─── Voice blocked ────────────────────────────────────────────────
const VOICE_BLOCKED_FR = "Activez le micro pour parler à Alex, ou écrivez ci-dessous.";
const VOICE_BLOCKED_EN = "Enable your mic to talk to Alex, or type below.";

// ─── Minimize CTA ─────────────────────────────────────────────────
const MINIMIZE_CTA_FR = "Réduire Alex";
const MINIMIZE_CTA_EN = "Minimize Alex";

// ─── Quick Action Labels ──────────────────────────────────────────
export const QUICK_ACTIONS = {
  homeowner_problem: { fr: "J'ai un problème", en: "I have a problem" },
  photo_upload: { fr: "Envoyer une photo", en: "Send a photo" },
  quote_compare: { fr: "Comparer des soumissions", en: "Compare quotes" },
  contractor_onboarding: { fr: "Je suis entrepreneur", en: "I'm a contractor" },
  booking: { fr: "Prendre rendez-vous", en: "Book an appointment" },
} as const;

// ─── Low confidence hint ──────────────────────────────────────────
const LOW_CONF_FR = "Je n'ai pas bien compris. Pouvez-vous reformuler?";
const LOW_CONF_EN = "I didn't quite catch that. Could you rephrase?";

// ─── Noise detected ──────────────────────────────────────────────
const NOISE_FR = "Il y a du bruit ambiant — essayez de vous rapprocher du micro.";
const NOISE_EN = "There's background noise — try moving closer to the mic.";

// ─── Helpers ──────────────────────────────────────────────────────

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function getGreeting(lang: AlexLanguage, _role?: AlexUserRole): string {
  return lang === "fr-CA" ? pick(GREETINGS_FR) : pick(GREETINGS_EN);
}

export function getRestoredGreeting(lang: AlexLanguage): string {
  return lang === "fr-CA" ? pick(RESTORED_FR) : pick(RESTORED_EN);
}

export function getSoftPrompt(lang: AlexLanguage): string {
  return lang === "fr-CA" ? pick(SOFT_PROMPTS_FR) : pick(SOFT_PROMPTS_EN);
}

export function getFallbackText(lang: AlexLanguage): string {
  return lang === "fr-CA" ? FALLBACK_TEXT_FR : FALLBACK_TEXT_EN;
}

export function getVoiceBlockedText(lang: AlexLanguage): string {
  return lang === "fr-CA" ? VOICE_BLOCKED_FR : VOICE_BLOCKED_EN;
}

export function getMinimizeCta(lang: AlexLanguage): string {
  return lang === "fr-CA" ? MINIMIZE_CTA_FR : MINIMIZE_CTA_EN;
}

export function getLowConfidenceHint(lang: AlexLanguage): string {
  return lang === "fr-CA" ? LOW_CONF_FR : LOW_CONF_EN;
}

export function getNoiseHint(lang: AlexLanguage): string {
  return lang === "fr-CA" ? NOISE_FR : NOISE_EN;
}

export function getQuickActionLabel(key: keyof typeof QUICK_ACTIONS, lang: AlexLanguage): string {
  return lang === "fr-CA" ? QUICK_ACTIONS[key].fr : QUICK_ACTIONS[key].en;
}
