/**
 * BrandPhoneticLock — Zero-latency brand pronunciation guard.
 * Ensures UNPRO is NEVER sent raw to TTS engines.
 * Separates displayText (visual) from speechText (TTS input).
 */
import { supabase } from "@/integrations/supabase/client";

// ─── Hardcoded fallbacks (NEVER rely solely on DB) ────────────────
const FALLBACK_SPEECH: Record<string, string> = {
  fr: "Un Pro",
  en: "Hun Pro",
};

// ─── Anti-letter-spelling patterns ────────────────────────────────
const ANTI_SPELL_PATTERNS: [RegExp, string][] = [
  [/\bU[\.\s]?N[\.\s]?P[\.\s]?R[\.\s]?O\b/gi, "__BRAND__"],
  [/\byou[-\s]?en[-\s]?pro\b/gi, "__BRAND__"],
  [/\byou[-\s]?en\b/gi, "__BRAND_PREFIX__"],
  [/\bU\.N\.\b/gi, "__BRAND_PREFIX__"],
];

// ─── Brand detection (all variants) ──────────────────────────────
const BRAND_PATTERNS = [
  /\bUNPRO\b/gi,
  /\bUnpro\b/g,
  /\bUn\s+Pro\b/gi,
  /\bUN\s+PRO\b/gi,
  /\bun-pro\b/gi,
];

export interface PhoneticLockResult {
  displayText: string;
  speechText: string;
  brandDetected: boolean;
  ruleApplied: string | null;
  languageCode: string;
}

interface CachedLockRule {
  id: string;
  speech_text: string;
  context_type: string;
  priority: number;
}

let ruleCache: { rules: CachedLockRule[]; lang: string; at: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000;

async function fetchLockRules(lang: string): Promise<CachedLockRule[]> {
  const langKey = lang.startsWith("en") ? "en" : "fr";
  if (ruleCache && ruleCache.lang === langKey && Date.now() - ruleCache.at < CACHE_TTL) {
    return ruleCache.rules;
  }
  try {
    const { data } = await supabase
      .from("alex_brand_phonetic_lock")
      .select("id, speech_text, context_type, priority")
      .eq("brand_key", "unpro")
      .eq("language_code", langKey)
      .eq("is_active", true)
      .eq("is_forced", true)
      .order("priority", { ascending: false });
    const rules = (data || []) as CachedLockRule[];
    ruleCache = { rules, lang: langKey, at: Date.now() };
    return rules;
  } catch {
    return [];
  }
}

function getSpeechForm(rules: CachedLockRule[], lang: string): { text: string; ruleId: string | null } {
  const langKey = lang.startsWith("en") ? "en" : "fr";
  const globalRule = rules.find(r => r.context_type === "global");
  if (globalRule) return { text: globalRule.speech_text, ruleId: globalRule.id };
  return { text: FALLBACK_SPEECH[langKey] || FALLBACK_SPEECH.fr, ruleId: null };
}

/**
 * Core preprocessing — call this BEFORE any TTS synthesis.
 * Returns separate displayText and speechText.
 */
export async function applyBrandPhoneticLock(
  text: string,
  lang: string = "fr"
): Promise<PhoneticLockResult> {
  const langKey = lang.startsWith("en") ? "en" : "fr";
  const displayText = text; // Never modify display

  // Check if brand is present
  const hasBrand = BRAND_PATTERNS.some(p => p.test(text));
  // Reset regex lastIndex
  BRAND_PATTERNS.forEach(p => { p.lastIndex = 0; });

  if (!hasBrand) {
    // Still run anti-spell guard
    let cleaned = text;
    const antiSpellHit = ANTI_SPELL_PATTERNS.some(([p]) => { p.lastIndex = 0; return p.test(text); });
    if (antiSpellHit) {
      const fallback = FALLBACK_SPEECH[langKey];
      for (const [pattern] of ANTI_SPELL_PATTERNS) {
        pattern.lastIndex = 0;
        cleaned = cleaned.replace(pattern, fallback);
      }
      cleaned = cleaned.replace(/__BRAND__/g, fallback);
      cleaned = cleaned.replace(/__BRAND_PREFIX__/g, fallback.split(" ")[0]);
      return { displayText, speechText: cleaned, brandDetected: true, ruleApplied: "anti-spell-fallback", languageCode: langKey };
    }
    return { displayText, speechText: text, brandDetected: false, ruleApplied: null, languageCode: langKey };
  }

  // Fetch DB rules
  const rules = await fetchLockRules(lang);
  const { text: spokenForm, ruleId } = getSpeechForm(rules, lang);

  // Replace all brand variants with spoken form
  let speechText = text;
  for (const pattern of BRAND_PATTERNS) {
    pattern.lastIndex = 0;
    speechText = speechText.replace(pattern, spokenForm);
  }

  // Run anti-spell guard on result too
  for (const [pattern] of ANTI_SPELL_PATTERNS) {
    pattern.lastIndex = 0;
    speechText = speechText.replace(pattern, spokenForm);
  }
  speechText = speechText.replace(/__BRAND__/g, spokenForm);
  speechText = speechText.replace(/__BRAND_PREFIX__/g, spokenForm.split(" ")[0]);

  return { displayText, speechText, brandDetected: true, ruleApplied: ruleId, languageCode: langKey };
}

/**
 * Synchronous version using only hardcoded fallbacks (for hot paths).
 */
export function applyBrandPhoneticLockSync(text: string, lang: string = "fr"): PhoneticLockResult {
  const langKey = lang.startsWith("en") ? "en" : "fr";
  const displayText = text;
  const spokenForm = FALLBACK_SPEECH[langKey];

  let speechText = text;
  let brandDetected = false;

  for (const pattern of BRAND_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(speechText)) brandDetected = true;
    pattern.lastIndex = 0;
    speechText = speechText.replace(pattern, spokenForm);
  }

  for (const [pattern] of ANTI_SPELL_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(speechText)) brandDetected = true;
    pattern.lastIndex = 0;
    speechText = speechText.replace(pattern, spokenForm);
  }
  speechText = speechText.replace(/__BRAND__/g, spokenForm);
  speechText = speechText.replace(/__BRAND_PREFIX__/g, spokenForm.split(" ")[0]);

  return { displayText, speechText, brandDetected, ruleApplied: "hardcoded-fallback", languageCode: langKey };
}

/**
 * Log phonetic event (fire-and-forget).
 */
export function logPhoneticEvent(result: PhoneticLockResult, engine?: string) {
  if (!result.brandDetected) return;
  supabase
    .from("alex_phonetic_events")
    .insert({
      brand_key: "unpro",
      language_code: result.languageCode,
      original_text: result.displayText.slice(0, 500),
      processed_text: result.speechText.slice(0, 500),
      engine: engine || "default",
      rule_id: result.ruleApplied && result.ruleApplied.length > 10 ? result.ruleApplied : null,
      success: true,
    } as any)
    .then(({ error }) => {
      if (error) console.warn("[PhoneticLock] Log failed:", error.message);
    });
}

export function clearPhoneticLockCache() {
  ruleCache = null;
}
