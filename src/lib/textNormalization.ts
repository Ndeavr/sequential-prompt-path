/**
 * Text normalization & mojibake repair utilities.
 *
 * Use these to defensively clean any text coming from CSV imports, scrapers,
 * pasted user input, third-party APIs, or legacy DB rows before persisting
 * or rendering. Pure functions, zero dependencies, safe to call repeatedly
 * (idempotent).
 *
 * Never call on phone numbers, emails, URLs, RBQ/NEQ codes, or postal codes —
 * the helpers below auto-detect those formats and pass them through unchanged.
 */

// Most common Latin-1 → UTF-8 double-encoding (mojibake) sequences.
// Order matters: longer multi-byte sequences must be replaced before shorter
// single-byte ones (e.g. "Ã©" before "Ã").
const MOJIBAKE_MAP: Array<[string, string]> = [
  // Windows-1252 punctuation re-decoded as UTF-8
  ['â€™', '\u2019'], // '
  ['â€˜', '\u2018'], // '
  ['â€œ', '\u201C'], // "
  ['â€\u009d', '\u201D'], // "
  ['â€"', '\u2014'], // —
  ['â€"', '\u2013'], // –
  ['â€¢', '\u2022'], // •
  ['â€¦', '\u2026'], // …
  ['â‚¬', '€'],
  ['Â\u00a0', '\u00a0'],
  ['Â ', ' '],

  // Lowercase accented Latin (most frequent in fr-CA)
  ['Ã©', 'é'], ['Ã¨', 'è'], ['Ãª', 'ê'], ['Ã«', 'ë'],
  ['Ã ', 'à'], ['Ã¢', 'â'], ['Ã¤', 'ä'],
  ['Ã§', 'ç'],
  ['Ã®', 'î'], ['Ã¯', 'ï'],
  ['Ã´', 'ô'], ['Ã¶', 'ö'],
  ['Ã¹', 'ù'], ['Ã»', 'û'], ['Ã¼', 'ü'],
  ['Ã½', 'ý'], ['Ã¿', 'ÿ'],
  ['Ã±', 'ñ'],
  ['Ã¥', 'å'], ['Ã¦', 'æ'],
  ['Ã°', 'ð'], ['Ã¸', 'ø'], ['Ã¾', 'þ'], ['ÃŸ', 'ß'],

  // Uppercase accented Latin
  ['Ã€', 'À'], ['Ã\u0081', 'Á'], ['Ã‚', 'Â'], ['Ãƒ', 'Ã'], ['Ã„', 'Ä'], ['Ã…', 'Å'],
  ['Ã†', 'Æ'], ['Ã‡', 'Ç'],
  ['Ãˆ', 'È'], ['Ã‰', 'É'], ['ÃŠ', 'Ê'], ['Ã‹', 'Ë'],
  ['ÃŒ', 'Ì'], ['Ã\u008d', 'Í'], ['ÃŽ', 'Î'], ['Ã\u008f', 'Ï'],
  ['Ã\u0090', 'Ð'], ['Ã‘', 'Ñ'],
  ['Ã’', 'Ò'], ['Ã"', 'Ó'], ['Ã"', 'Ô'], ['Ã•', 'Õ'], ['Ã–', 'Ö'],
  ['Ã˜', 'Ø'],
  ['Ã™', 'Ù'], ['Ãš', 'Ú'], ['Ã›', 'Û'], ['Ãœ', 'Ü'],
  ['Ã\u009d', 'Ý'], ['Ãž', 'Þ'],
];

const ZERO_WIDTH_RE = /[\u200B-\u200D\uFEFF\u2060]/g;
const CONTROL_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

// Patterns that should NEVER be touched by repair/normalization.
const PHONE_RE = /^[\s+()\-.\d]{7,}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_RE = /^(https?:\/\/|www\.)[^\s]+$|^[a-z0-9-]+(\.[a-z0-9-]+)+(\/.*)?$/i;
const RBQ_RE = /^\d{4}-\d{4}-\d{2}$/;
const NEQ_RE = /^\d{10}$/;
const POSTAL_RE = /^[A-Za-z]\d[A-Za-z][\s-]?\d[A-Za-z]\d$/;

function isProtectedFormat(input: string): boolean {
  const t = input.trim();
  return (
    PHONE_RE.test(t) ||
    EMAIL_RE.test(t) ||
    URL_RE.test(t) ||
    RBQ_RE.test(t) ||
    NEQ_RE.test(t) ||
    POSTAL_RE.test(t)
  );
}

/**
 * Repair Latin-1↔UTF-8 mojibake in a string. Returns input unchanged if no
 * known mojibake sequence is found, or if the string looks like a phone /
 * email / URL / RBQ / NEQ / postal code.
 */
export function repairMojibake(input: string): string {
  if (!input || typeof input !== 'string') return input;
  if (!input.includes('Ã') && !input.includes('Â') && !input.includes('â€')) {
    return input;
  }
  if (isProtectedFormat(input)) return input;

  let out = input;
  for (const [bad, good] of MOJIBAKE_MAP) {
    if (out.includes(bad)) out = out.split(bad).join(good);
  }
  return out;
}

export interface NormalizeOptions {
  /** Normalize curly quotes/apostrophes to straight ASCII. Default false. */
  asciiQuotes?: boolean;
  /** Collapse runs of whitespace to a single space. Default true. */
  collapseSpaces?: boolean;
}

/**
 * Apply Unicode NFC, strip invisible/control chars, optionally normalize
 * quotes, and trim. Preserves all valid French accents.
 */
export function normalizeText(
  input: string,
  opts: NormalizeOptions = {},
): string {
  if (!input || typeof input !== 'string') return input;
  const { asciiQuotes = false, collapseSpaces = true } = opts;

  let out = input.normalize('NFC');
  out = out.replace(ZERO_WIDTH_RE, '');
  out = out.replace(CONTROL_RE, '');
  // Non-breaking space → regular space
  out = out.replace(/\u00a0/g, ' ');

  if (asciiQuotes) {
    out = out
      .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
      .replace(/[\u201C\u201D\u201E\u201F]/g, '"');
  }

  if (collapseSpaces) out = out.replace(/[ \t]+/g, ' ');
  return out.trim();
}

export interface SanitizedText {
  value: string;
  repaired: boolean;
  /** 'high' = clean result, 'low' = residual mojibake markers detected. */
  confidence: 'high' | 'low';
}

/**
 * Pipeline: repairMojibake → normalizeText. Returns metadata so callers can
 * flag low-confidence rows for manual review. Original is preserved when
 * confidence is low (caller decides whether to keep value or original).
 */
export function sanitizeImportedText(
  input: string | null | undefined,
  opts?: NormalizeOptions,
): SanitizedText {
  if (input == null) return { value: '', repaired: false, confidence: 'high' };
  const original = String(input);
  if (isProtectedFormat(original)) {
    return { value: original.trim(), repaired: false, confidence: 'high' };
  }

  const repaired = repairMojibake(original);
  const normalized = normalizeText(repaired, opts);
  const wasRepaired = repaired !== original;
  // If we still see mojibake markers after repair, flag low confidence.
  const residual = /Ã[\s\u0080-\u00ff€]|â€/.test(normalized);

  return {
    value: residual ? original.trim() : normalized,
    repaired: wasRepaired && !residual,
    confidence: residual ? 'low' : 'high',
  };
}

/**
 * Convenience: sanitize and return only the cleaned string.
 */
export function cleanText(
  input: string | null | undefined,
  opts?: NormalizeOptions,
): string {
  return sanitizeImportedText(input, opts).value;
}
