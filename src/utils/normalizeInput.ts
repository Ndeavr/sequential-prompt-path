/**
 * UNPRO — Global input normalizer.
 *
 * Silently cleans user input before validation. Never reject for harmless
 * formatting. Returns canonical value to save + optional display string +
 * validity after normalization.
 */

export type NormalizableType =
  | "email"
  | "phone"
  | "url"
  | "name"
  | "company"
  | "address"
  | "postal_code"
  | "rbq"
  | "neq"
  | "text"
  | "textarea";

export interface NormalizeResult {
  /** Canonical value to save in DB. */
  value: string;
  /** Optional human-friendly representation. */
  display: string;
  /** True only if value is empty OR passes type validation after normalization. */
  valid: boolean;
  /** True if normalization altered the raw input. */
  changed: boolean;
  /** FR-CA reason when invalid. */
  reason?: string;
}

export interface NormalizeOptions {
  /** Override default truncation length. Ignored for hard-format types (email/phone/postal/rbq/neq). */
  maxLength?: number;
}

/* ------------------------------------------------------------------ */
/* Base cleaning                                                       */
/* ------------------------------------------------------------------ */

const INVISIBLE_RE = /[\u200B-\u200F\u2028-\u202F\uFEFF\u00AD\u034F\u061C\u180E]/g;
const NBSP_RE = /[\u00A0\u202F\u2007]/g;

/** Strip invisibles, replace NBSP/tabs/newlines with space, normalize smart punct, collapse spaces, trim. */
function baseClean(raw: string, opts?: { keepNewlines?: boolean }): string {
  if (raw == null) return "";
  let s = String(raw);
  s = s.replace(INVISIBLE_RE, "");
  s = s.replace(NBSP_RE, " ");
  // Smart quotes / dashes
  s = s.replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"').replace(/[\u2013\u2014]/g, "-");
  if (opts?.keepNewlines) {
    s = s.replace(/[\t\r]/g, " ");
    // Collapse 3+ newlines to 2
    s = s.replace(/\n{3,}/g, "\n\n");
    // Collapse runs of spaces (not touching newlines)
    s = s.replace(/[ ]{2,}/g, " ");
    // Trim each line
    s = s.split("\n").map((l) => l.replace(/[ ]+$/g, "").replace(/^[ ]+/g, "")).join("\n");
  } else {
    s = s.replace(/[\t\n\r]/g, " ");
    s = s.replace(/ {2,}/g, " ");
  }
  return s.trim();
}

/* ------------------------------------------------------------------ */
/* Per-type normalizers                                                */
/* ------------------------------------------------------------------ */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normEmail(raw: string): NormalizeResult {
  const cleaned = baseClean(raw).toLowerCase().slice(0, 254);
  if (!cleaned) return { value: "", display: "", valid: true, changed: raw !== "" };
  const valid = EMAIL_RE.test(cleaned);
  return {
    value: cleaned,
    display: cleaned,
    valid,
    changed: cleaned !== raw,
    reason: valid ? undefined : "Courriel invalide.",
  };
}

function stripDigits(raw: string): string {
  return baseClean(raw).replace(/[^\d]/g, "");
}

function normPhone(raw: string): NormalizeResult {
  let digits = stripDigits(raw);
  if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);
  if (!digits) return { value: "", display: "", valid: true, changed: raw !== "" };
  if (digits.length !== 10) {
    return {
      value: digits,
      display: digits,
      valid: false,
      changed: true,
      reason: "Numéro de téléphone invalide.",
    };
  }
  const e164 = `+1${digits}`;
  const display = `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  return { value: e164, display, valid: true, changed: e164 !== raw };
}

const URL_DOMAIN_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+(\/.*)?$/i;

function normUrl(raw: string): NormalizeResult {
  let s = baseClean(raw);
  if (!s) return { value: "", display: "", valid: true, changed: raw !== "" };

  // Repair malformed schemes: "https // foo", "http //foo", "https:/foo", "https:\\foo"
  s = s.replace(/^\s*(https?)\s*[:]?\s*[\/\\]{1,}\s*/i, "$1://");
  s = s.replace(/^\s*(https?)\s+/i, "$1://");

  // If still no scheme, strip stray leading slashes/spaces and add https://
  if (!/^https?:\/\//i.test(s)) {
    s = s.replace(/^[\s\/\\:]+/, "");
    s = `https://${s}`;
  }

  // Lowercase scheme + host
  s = s.replace(/^(https?:\/\/)([^\/]+)(.*)$/i, (_m, scheme, host, rest) => {
    return scheme.toLowerCase() + host.toLowerCase().replace(/^www\./, "") + rest;
  });

  // Force https
  s = s.replace(/^http:\/\//i, "https://");

  // Strip trailing slash on bare host
  s = s.replace(/\/+$/, "");

  const bare = s.replace(/^https?:\/\//i, "");
  const valid = URL_DOMAIN_RE.test(bare);

  return {
    value: valid ? s : s,
    display: bare,
    valid,
    changed: s !== raw,
    reason: valid ? undefined : "Adresse web invalide.",
  };
}

function normName(raw: string, max = 120): NormalizeResult {
  const cleaned = baseClean(raw).slice(0, max);
  return { value: cleaned, display: cleaned, valid: true, changed: cleaned !== raw };
}

function normAddress(raw: string, max = 200): NormalizeResult {
  const cleaned = baseClean(raw).slice(0, max);
  return { value: cleaned, display: cleaned, valid: true, changed: cleaned !== raw };
}

const POSTAL_RE = /^[ABCEGHJKLMNPRSTVXY]\d[A-Z]\d[A-Z]\d$/;

function normPostal(raw: string): NormalizeResult {
  const compact = baseClean(raw).toUpperCase().replace(/[\s\-]/g, "");
  if (!compact) return { value: "", display: "", valid: true, changed: raw !== "" };
  const valid = POSTAL_RE.test(compact);
  if (!valid) {
    return {
      value: compact,
      display: compact,
      valid: false,
      changed: true,
      reason: "Code postal invalide.",
    };
  }
  const formatted = `${compact.slice(0, 3)} ${compact.slice(3)}`;
  return { value: formatted, display: formatted, valid: true, changed: formatted !== raw };
}

function normRbq(raw: string): NormalizeResult {
  const compact = baseClean(raw).replace(/[\s\-]/g, "");
  if (!compact) return { value: "", display: "", valid: true, changed: raw !== "" };
  const valid = /^\d{10}$/.test(compact);
  if (!valid) {
    return {
      value: compact,
      display: compact,
      valid: false,
      changed: true,
      reason: "Numéro RBQ invalide.",
    };
  }
  const formatted = `${compact.slice(0, 4)}-${compact.slice(4, 8)}-${compact.slice(8)}`;
  return { value: formatted, display: formatted, valid: true, changed: formatted !== raw };
}

function normNeq(raw: string): NormalizeResult {
  const compact = baseClean(raw).replace(/[\s\-]/g, "");
  if (!compact) return { value: "", display: "", valid: true, changed: raw !== "" };
  const valid = /^\d{10}$/.test(compact);
  return {
    value: compact,
    display: compact,
    valid,
    changed: compact !== raw,
    reason: valid ? undefined : "NEQ invalide.",
  };
}

function normText(raw: string, max = 5000): NormalizeResult {
  const cleaned = baseClean(raw).slice(0, max);
  return { value: cleaned, display: cleaned, valid: true, changed: cleaned !== raw };
}

function normTextarea(raw: string, max = 5000): NormalizeResult {
  const cleaned = baseClean(raw, { keepNewlines: true }).slice(0, max);
  return { value: cleaned, display: cleaned, valid: true, changed: cleaned !== raw };
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

export function normalizeInput(
  raw: string,
  type: NormalizableType,
  opts?: NormalizeOptions
): NormalizeResult {
  const max = opts?.maxLength;
  switch (type) {
    case "email": return normEmail(raw);
    case "phone": return normPhone(raw);
    case "url": return normUrl(raw);
    case "name": return normName(raw, max);
    case "company": return normName(raw, max);
    case "address": return normAddress(raw, max);
    case "postal_code": return normPostal(raw);
    case "rbq": return normRbq(raw);
    case "neq": return normNeq(raw);
    case "textarea": return normTextarea(raw, max);
    case "text":
    default:
      return normText(raw, max);
  }
}

/** Convenience: return just the canonical value (or "" if empty). */
export function normalizeValue(raw: string, type: NormalizableType, opts?: NormalizeOptions): string {
  return normalizeInput(raw, type, opts).value;
}

/* ------------------------------------------------------------------ */
/* Heuristic field normalization for form payloads                     */
/* ------------------------------------------------------------------ */

const KEY_TYPE_MAP: Array<[RegExp, NormalizableType]> = [
  [/^email$|_email$/i, "email"],
  [/^phone$|_phone$|^tel$|^mobile$/i, "phone"],
  [/^website$|^site$|^url$|_url$/i, "url"],
  [/^postal(_code)?$|^zip$/i, "postal_code"],
  [/^rbq(_number)?$/i, "rbq"],
  [/^neq$/i, "neq"],
  [/^first_name$|^last_name$|^full_name$|^name$|^salutation$/i, "name"],
  [/^company(_name)?$|^business_name$|^organization$/i, "company"],
  [/^address$|^street$|^city$|^province$|^state$/i, "address"],
  [/^message$|^notes?$|^description$|^comments?$/i, "textarea"],
];

/**
 * Normalize a flat record of form fields by key heuristic.
 * Returns { normalized, changed: Record<key, true> }.
 */
export function normalizeFormRecord<T extends Record<string, unknown>>(
  record: T
): { normalized: T; changed: Partial<Record<keyof T, true>> } {
  const out: Record<string, unknown> = { ...record };
  const changed: Record<string, true> = {};
  for (const [key, val] of Object.entries(record)) {
    if (typeof val !== "string") continue;
    const match = KEY_TYPE_MAP.find(([re]) => re.test(key));
    const type: NormalizableType = match ? match[1] : "text";
    const res = normalizeInput(val, type);
    if (res.value !== val) {
      out[key] = res.value;
      changed[key] = true;
    }
  }
  return { normalized: out as T, changed: changed as Partial<Record<keyof T, true>> };
}
