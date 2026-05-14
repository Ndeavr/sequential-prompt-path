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

export function prepareAlexSpeechText(
  text: string,
  language: AlexSpeechLang = "fr",
): string {
  if (!text) return text;
  let out = text;

  if (language === "fr") {
    // d'UNPRO / d’UNPRO → d'Un Pro
    out = out.replace(new RegExp(`d${APOSTROPHES}UNPRO`, "gi"), "d'Un Pro");
    // de UNPRO → d'Un Pro (elision)
    out = out.replace(/\bde\s+UNPRO\b/gi, "d'Un Pro");
    // standalone UNPRO → Un Pro
    out = out.replace(/\bUNPRO\b/gi, "Un Pro");
  } else {
    out = out.replace(/\bUNPRO\b/gi, "Hun Pro");
  }

  return out;
}
