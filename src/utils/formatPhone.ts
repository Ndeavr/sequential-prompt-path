/**
 * Global phone formatting utility — delegates to normalizeInput.
 *
 * Display format: (514) 555-1234
 * Storage format (E.164): +15145551234
 */
import { normalizeInput } from "./normalizeInput";

function stripNonDigits(raw: string): string {
  return (raw || "").replace(/[^\d]/g, "");
}
function stripCountryCode(digits: string): string {
  if (digits.length === 11 && digits.startsWith("1")) return digits.slice(1);
  return digits;
}

/** Progressive display formatting while typing. Never errors. */
export function formatPhoneDisplay(raw: string): string {
  const digits = stripCountryCode(stripNonDigits(raw)).slice(0, 10);
  if (digits.length === 0) return "";
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/** Final formatting on blur — canonical display. */
export function formatPhoneFinal(raw: string): string {
  const r = normalizeInput(raw, "phone");
  if (r.valid && r.display) return r.display;
  return formatPhoneDisplay(raw);
}

/** E.164 for DB storage; null if invalid. */
export function phoneToE164(raw: string): string | null {
  const r = normalizeInput(raw, "phone");
  return r.valid ? r.value : null;
}

export function phoneDigitsOnly(raw: string): string {
  return stripCountryCode(stripNonDigits(raw)).slice(0, 10);
}

export function isValidPhone(raw: string): boolean {
  if (!raw?.trim()) return false;
  return normalizeInput(raw, "phone").valid;
}
