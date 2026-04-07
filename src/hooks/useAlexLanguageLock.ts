/**
 * useAlexLanguageLock — Prevents unwanted language switching.
 * French-CA is locked by default. Only switches to English after
 * 2+ consecutive high-confidence English utterances.
 */
import { useState, useRef, useCallback } from "react";

export type LockedLanguage = "fr-CA" | "en-CA";

interface LanguageLockConfig {
  /** Number of consecutive English utterances needed to switch */
  switchThreshold: number;
  /** Minimum confidence to count as English */
  minConfidence: number;
}

const DEFAULT_CONFIG: LanguageLockConfig = {
  switchThreshold: 2,
  minConfidence: 0.75,
};

// Common English words that should NOT trigger a language switch
const ENGLISH_FALSE_POSITIVES = new Set([
  "west island", "email", "ok", "okay", "yes", "no", "sorry",
  "please", "thank you", "thanks", "hi", "hello", "bye",
  "smart", "home", "online", "feedback", "business",
]);

/**
 * Simple heuristic: detect if text is predominantly English
 */
function detectLanguage(text: string): { lang: LockedLanguage; confidence: number } {
  const lower = text.toLowerCase().trim();
  
  // Check false positives
  if (ENGLISH_FALSE_POSITIVES.has(lower)) {
    return { lang: "fr-CA", confidence: 0.3 };
  }

  // French indicators
  const frenchIndicators = [
    /\b(je|tu|il|elle|nous|vous|ils|elles|on)\b/i,
    /\b(le|la|les|un|une|des|du|de|au|aux)\b/i,
    /\b(est|sont|suis|êtes|avons|avez|ont)\b/i,
    /\b(pour|dans|avec|chez|sur|sous|entre)\b/i,
    /\b(mais|ou|et|donc|car|ni|que|qui)\b/i,
    /[àâäéèêëïîôùûüç]/i,
    /\b(oui|non|merci|bonjour|bonsoir|salut)\b/i,
    /\b(rénovation|soumission|entrepreneur|travaux|maison)\b/i,
  ];

  const englishIndicators = [
    /\b(the|a|an|this|that|these|those)\b/i,
    /\b(is|are|am|was|were|been|being)\b/i,
    /\b(have|has|had|do|does|did)\b/i,
    /\b(will|would|could|should|can|may|might)\b/i,
    /\b(what|where|when|how|why|who|which)\b/i,
    /\b(and|but|or|not|so|if|because)\b/i,
    /\b(want|need|looking|think|know)\b/i,
  ];

  let frenchScore = 0;
  let englishScore = 0;

  for (const pat of frenchIndicators) {
    if (pat.test(lower)) frenchScore++;
  }
  for (const pat of englishIndicators) {
    if (pat.test(lower)) englishScore++;
  }

  if (frenchScore >= englishScore) {
    return { lang: "fr-CA", confidence: Math.min(1, frenchScore / 3) };
  }

  return { lang: "en-CA", confidence: Math.min(1, englishScore / 3) };
}

export function useAlexLanguageLock(config?: Partial<LanguageLockConfig>) {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const [currentLanguage, setCurrentLanguage] = useState<LockedLanguage>("fr-CA");
  const consecutiveEnglishRef = useRef(0);

  const processTranscript = useCallback((text: string): LockedLanguage => {
    const { lang, confidence } = detectLanguage(text);

    if (lang === "en-CA" && confidence >= cfg.minConfidence) {
      consecutiveEnglishRef.current++;
      if (consecutiveEnglishRef.current >= cfg.switchThreshold) {
        setCurrentLanguage("en-CA");
        return "en-CA";
      }
    } else {
      consecutiveEnglishRef.current = 0;
      if (lang === "fr-CA") {
        setCurrentLanguage("fr-CA");
      }
    }

    return currentLanguage;
  }, [cfg, currentLanguage]);

  const forceLanguage = useCallback((lang: LockedLanguage) => {
    setCurrentLanguage(lang);
    consecutiveEnglishRef.current = 0;
  }, []);

  const reset = useCallback(() => {
    setCurrentLanguage("fr-CA");
    consecutiveEnglishRef.current = 0;
  }, []);

  return {
    currentLanguage,
    processTranscript,
    forceLanguage,
    reset,
  };
}
