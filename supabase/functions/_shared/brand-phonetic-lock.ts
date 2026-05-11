/**
 * brand-phonetic-lock (Deno) — Mirror of src/services/alex/brandPhoneticLock.ts.
 * Forces UNPRO to be spoken as:
 *   FR: "Un Pro"
 *   EN: "Heun Pro"
 *
 * MUST be applied to every text payload before it is sent to ElevenLabs TTS.
 */

const FALLBACK_SPEECH: Record<string, string> = {
  fr: "Un Pro",
  en: "Heun Pro",
};

const BRAND_PATTERNS: RegExp[] = [
  /\bUNPRO\b/gi,
  /\bUnpro\b/g,
  /\bUn-?Pro\b/gi,
  /\bUN\s+PRO\b/g,
  /\bUne\s+Pro\b/gi,
];

const ANTI_SPELL_PATTERNS: RegExp[] = [
  /\bU[\.\s]?N[\.\s]?P[\.\s]?R[\.\s]?O\b/gi,
  /\byou[-\s]?en[-\s]?pro\b/gi,
  /\bU\.N\.\s*Pro\b/gi,
  /\bHun[-\s]?Pro\b/gi,
];

export function applyBrandPhoneticLock(text: string, lang: string = "fr"): string {
  if (!text) return text;
  const langKey = lang.startsWith("en") ? "en" : "fr";
  const spoken = FALLBACK_SPEECH[langKey];

  let out = text;
  for (const p of BRAND_PATTERNS) {
    p.lastIndex = 0;
    out = out.replace(p, spoken);
  }
  for (const p of ANTI_SPELL_PATTERNS) {
    p.lastIndex = 0;
    out = out.replace(p, spoken);
  }
  return out;
}
