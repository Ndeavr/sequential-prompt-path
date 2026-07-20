/**
 * getSpeechText — Canonical brand speech preprocessor.
 *
 * Separates DISPLAY text (what the user sees) from SPEECH text
 * (what the TTS engine reads). Every voice/TTS/video pipeline
 * MUST call this before sending text to a synthesis provider.
 *
 * Wraps the existing brand phonetic lock so all consumers share
 * one entry point.
 */
import {
  applyBrandPhoneticLock,
  applyBrandPhoneticLockSync,
  type PhoneticLockResult,
} from "@/services/alex/brandPhoneticLock";
import { prepareAlexSpeechText } from "@/lib/prepareAlexSpeechText";

export type SpeechLanguage = "fr-CA" | "fr" | "en-CA" | "en" | string;

export interface SpeechTextResult {
  displayText: string;
  speechText: string;
  brandDetected: boolean;
  language: "fr" | "en";
}

function normalizeLang(language: SpeechLanguage): "fr" | "en" {
  return language && language.toLowerCase().startsWith("en") ? "en" : "fr";
}

/**
 * Synchronous — uses hardcoded fallbacks + regex normalizer.
 * Safe for hot paths where DB lookup is impossible.
 */
export function getSpeechText(
  text: string,
  language: SpeechLanguage = "fr-CA",
): SpeechTextResult {
  const lang = normalizeLang(language);
  const displayText = text;
  const locked = applyBrandPhoneticLockSync(text, lang);
  const speechText = prepareAlexSpeechText(locked.speechText, lang);
  return {
    displayText,
    speechText,
    brandDetected: locked.brandDetected,
    language: lang,
  };
}

/**
 * Async — consults the DB-backed brand phonetic lock, then applies
 * the deterministic normalizer. Use in edge functions and admin
 * previews where a DB round-trip is acceptable.
 */
export async function getSpeechTextAsync(
  text: string,
  language: SpeechLanguage = "fr-CA",
): Promise<SpeechTextResult & { ruleApplied: string | null }> {
  const lang = normalizeLang(language);
  const displayText = text;
  const locked: PhoneticLockResult = await applyBrandPhoneticLock(text, lang);
  const speechText = prepareAlexSpeechText(locked.speechText, lang);
  return {
    displayText,
    speechText,
    brandDetected: locked.brandDetected,
    language: lang,
    ruleApplied: locked.ruleApplied,
  };
}
