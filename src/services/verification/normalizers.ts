/**
 * UNPRO Verification Engine — Input Normalization Module
 */
import type { SearchType } from "./types";

/** Remove spaces, dashes, parens; strip leading +1 or 1 */
export function normalizePhone(raw: string): string {
  return raw.replace(/[\s\-\(\)\.]/g, "").replace(/^\+?1(?=\d{10}$)/, "");
}

/** Generate phone variants (with/without area code, formatted) */
export function phoneVariants(normalized: string): string[] {
  if (normalized.length !== 10) return [normalized];
  const area = normalized.slice(0, 3);
  const mid = normalized.slice(3, 6);
  const last = normalized.slice(6);
  return [
    normalized,
    `${area}-${mid}-${last}`,
    `(${area}) ${mid}-${last}`,
    `1${normalized}`,
    `+1${normalized}`,
    normalized.slice(-7), // local without area
  ];
}

/** Detect mobile vs landline (QC heuristic: 438/514/579/581/418/450/819 = landline/mobile) */
export function isMobilePhone(normalized: string): boolean {
  const mobileAreaCodes = ["438", "579", "581", "873"];
  return mobileAreaCodes.includes(normalized.slice(0, 3));
}

/** Remove corporate suffixes and normalize casing */
export function normalizeBusinessName(raw: string): string {
  return raw
    .trim()
    .replace(
      /\b(inc|ltée|ltd|enr|senc|s\.e\.n\.c|llc|corp|corporation|cie|compagnie|limitée|limited|société|group|groupe)\b\.?/gi,
      ""
    )
    .replace(/\s+/g, " ")
    .trim();
}

/** Normalize RBQ license number to 10-digit format */
export function normalizeRbq(raw: string): string {
  return raw.replace(/[\s\-\.]/g, "");
}

/** Normalize NEQ (10 digits) */
export function normalizeNeq(raw: string): string {
  return raw.replace(/[\s\-\.]/g, "");
}

/** Normalize website to bare domain */
export function normalizeDomain(raw: string): string {
  return raw
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/\/.*$/, "")
    .toLowerCase()
    .trim();
}

/** Auto-detect input type */
export function detectInputType(raw: string): SearchType {
  const cleaned = raw.trim();
  // RBQ: 8-10 digits, often formatted XXXX-XXXX-XX
  const rbqDigits = cleaned.replace(/[\s\-]/g, "");
  if (/^\d{8,10}$/.test(rbqDigits) && cleaned.includes("-") && rbqDigits.length === 10) return "rbq";
  // Phone: 10 digits after normalization
  const phoneDigits = cleaned.replace(/[\s\-\(\)\.+]/g, "").replace(/^1(?=\d{10}$)/, "");
  if (/^\d{10}$/.test(phoneDigits) && !cleaned.includes("-")) return "phone";
  // NEQ: 10 digits
  if (/^\d{10}$/.test(rbqDigits)) return "neq";
  // Website
  if (/^https?:\/\//i.test(cleaned) || /\.\w{2,}$/.test(cleaned)) return "website";
  return "name";
}
