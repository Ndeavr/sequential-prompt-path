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
// Single canonical opening per Alex System Prompt (FR only).
const GREETINGS_FR = [
  "Bonjour. Je suis Alex d'UNPRO. Quel problème puis-je vous aider à régler aujourd'hui?",
] as const;

// English fallback message (Alex is FR-only for now).
const ENGLISH_FALLBACK = "Pour le moment je fonctionne en français. Je termine mes cours d'anglais sous peu.";

const GREETINGS_EN = [ENGLISH_FALLBACK] as const;

// ─── Restored session greetings ───────────────────────────────────
const RESTORED_FR = [
  "Rebonjour. On continue où on en était?",
] as const;

const RESTORED_EN = [ENGLISH_FALLBACK] as const;

export { ENGLISH_FALLBACK };

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
const FALLBACK_TEXT_FR = "Alex reste disponible en mode texte.";
const FALLBACK_TEXT_EN = "Alex is available in text mode.";

// ─── Voice blocked ────────────────────────────────────────────────
const VOICE_BLOCKED_FR = "Touchez ici pour démarrer Alex.";
const VOICE_BLOCKED_EN = "Tap here to start Alex.";

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
