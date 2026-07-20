/**
 * prepareAlexSpeechText — Transforms displayed text into TTS-safe text.
 *
 * Critical: Alex must never spell out "UNPRO" letter by letter.
 * - French → "Un Pro"
 * - English → "Hun Pro"
 *
 * Only mutates the text sent to TTS. Display strings are untouched.
 */
export type AlexSpeechLang = "fr" | "en";

const APOSTROPHES = "['’]";

/**
 * Normalize every UNPRO-ish written variant into a phonetic-safe form
 * so TTS never spells the brand letter-by-letter and never says "une pro".
 *
 * Display strings are untouched — only TTS-bound text is mutated.
 */
export function prepareAlexSpeechText(
  text: string,
  language: AlexSpeechLang = "fr",
): string {
  if (!text) return text;
  let out = text;

  // ----- Normalize spelled-out / spaced / dotted variants FIRST -----
  // "U.N.PRO" / "U.N. PRO" / "U-N-PRO" — dotted/dashed → UNPRO (case-insensitive ok)
  out = out.replace(/\bU[.\-]N[.\-]?\s?PRO\b/gi, "UNPRO");
  // "U N PRO" (spaced, ALL CAPS only — avoid catching prose "un pro")
  out = out.replace(/\bU N PRO\b/g, "UNPRO");
  // "UNE PRO" / "une pro" — wrong-gender brand spelling
  out = out.replace(/\bUNE PRO\b/gi, "UNPRO");
  // unpro.ca / www.unpro.ca → "un pro point ca"
  const domainReplacement = language === "fr" ? "un pro point ca" : "un pro dot ca";
  out = out.replace(/\b(?:www\.)?unpro\.ca\b/gi, domainReplacement);

  if (language === "fr") {
    // d'UNPRO / d’UNPRO → d'Un Pro
    out = out.replace(new RegExp(`d${APOSTROPHES}UNPRO`, "gi"), "d'Un Pro");
    // de UNPRO → d'Un Pro (elision)
    out = out.replace(/\bde\s+UNPRO\b/gi, "d'Un Pro");
    // standalone UNPRO → Un Pro
    out = out.replace(/\bUNPRO\b/gi, "Un Pro");
  } else {
    out = out.replace(/\bUNPRO\b/gi, "Hun-pro");
  }

  return out;
}
