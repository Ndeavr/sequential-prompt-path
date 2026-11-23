// Pure GSM-7 helpers for outbound SMS (no Deno APIs).
// The stored/original text is never modified; only the provider copy is converted,
// and only when it contains characters outside GSM 03.38. Never truncates.

const GSM_BASIC =
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
const GSM_EXT = "^{}\\[~]|€\f";
const BASIC = new Set([...GSM_BASIC]);
const EXT = new Set([...GSM_EXT]);

// Transliteration for characters outside GSM-7. Accents already in GSM-7 (é è à ù ì ò É Ç) are kept.
const MAP: Record<string, string> = {
  "‘": "'", "’": "'", "‚": "'", "′": "'", "`": "'", "´": "'",
  "“": '"', "”": '"', "„": '"', "″": '"', "«": '"', "»": '"',
  "–": "-", "—": "-", "−": "-", "‐": "-", "‑": "-", "…": "...", "•": "-", "·": "-",
  "\u00A0": " ", "\u202F": " ", "\u2009": " ", "\u2007": " ", "\u2002": " ", "\u2003": " ", "\u2004": " ",
  "\u2005": " ", "\u2006": " ", "\u2008": " ", "\u200A": " ", "\t": " ",
  "â": "a", "á": "a", "ã": "a", "À": "A", "Â": "A", "Á": "A", "Ã": "A",
  "ç": "c",
  "ê": "e", "ë": "e", "È": "E", "Ê": "E", "Ë": "E",
  "î": "i", "ï": "i", "í": "i", "Î": "I", "Ï": "I", "Í": "I", "Ì": "I",
  "ô": "o", "ó": "o", "õ": "o", "Ô": "O", "Ó": "O", "Ò": "O", "Õ": "O",
  "û": "u", "ú": "u", "Û": "U", "Ú": "U", "Ù": "U",
  "ÿ": "y", "Ÿ": "Y", "œ": "oe", "Œ": "OE",
};
const STRIP = /[\u200B-\u200D\uFEFF\uFE0E\uFE0F\u{1F3FB}-\u{1F3FF}]|\p{Extended_Pictographic}|\p{Regional_Indicator}/gu;

export function isGsm7(text: string): boolean {
  for (const ch of text) if (!BASIC.has(ch) && !EXT.has(ch)) return false;
  return true;
}

/** Exact GSM-7 septet count (extension characters count 2). Returns null if not GSM-7. */
export function gsm7Septets(text: string): number | null {
  let n = 0;
  for (const ch of text) {
    if (BASIC.has(ch)) n += 1;
    else if (EXT.has(ch)) n += 2;
    else return null;
  }
  return n;
}

export type SmsEncodingInfo = { encoding: "GSM-7" | "UCS-2"; units: number; segments: number };

export function smsSegmentInfo(text: string): SmsEncodingInfo {
  const septets = gsm7Septets(text);
  if (septets !== null) return { encoding: "GSM-7", units: septets, segments: septets <= 160 ? 1 : Math.ceil(septets / 153) };
  const units = text.length; // UTF-16 code units
  return { encoding: "UCS-2", units, segments: units <= 70 ? 1 : Math.ceil(units / 67) };
}

/** Converts to GSM-7 only when needed. `unsupported` lists characters that could not be mapped. */
export function toGsm7(text: string): { text: string; changed: boolean; gsm7: boolean; unsupported: string[] } {
  const src = String(text ?? "").normalize("NFC");
  if (isGsm7(src)) return { text: src, changed: false, gsm7: true, unsupported: [] };
  let out = "";
  for (const ch of src.replace(STRIP, "")) out += MAP[ch] ?? ch;
  out = out.replace(/ {2,}/g, " ").replace(/ +\n/g, "\n").replace(/\n +/g, "\n").trim();
  const unsupported = [...new Set([...out].filter((c) => !BASIC.has(c) && !EXT.has(c)))];
  return { text: out, changed: out !== src, gsm7: unsupported.length === 0, unsupported };
}

export type ColdSmsIssue = "non_gsm7_char" | "exceeds_one_segment" | "missing_opt_out" | "missing_sender_identity";

/**
 * Cold outreach: the exact provider text (identity + opt-out + URL included) must be
 * GSM-7 and ≤ 160 septets. Rejects instead of truncating.
 */
export function prepareColdOutreachSms(body: string): {
  ok: boolean; send_body: string; septets: number | null; segments: number; transliterated: boolean; issues: ColdSmsIssue[];
} {
  const conv = toGsm7(body);
  const septets = gsm7Septets(conv.text);
  const issues: ColdSmsIssue[] = [];
  if (!conv.gsm7 || septets === null) issues.push("non_gsm7_char");
  if (septets !== null && septets > 160) issues.push("exceeds_one_segment");
  if (!/\b(STOP|ARRET)\b/.test(conv.text)) issues.push("missing_opt_out");
  if (!/\bUNPRO\b/i.test(conv.text)) issues.push("missing_sender_identity");
  return {
    ok: issues.length === 0, send_body: conv.text, septets, segments: smsSegmentInfo(conv.text).segments,
    transliterated: conv.changed, issues,
  };
}
