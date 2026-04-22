/**
 * Global phone formatting utility for Quebec/Canada numbers.
 * 
 * Display format: (514) 555-1234
 * Storage format (E.164): +15145551234
 */

/** Strip everything except digits */
function stripNonDigits(raw: string): string {
  // Remove all unicode whitespace, smart punctuation, tabs, newlines
  return raw.replace(/[^\d]/g, "");
}

/** Remove leading country code (1) if present and we have 11 digits */
function stripCountryCode(digits: string): string {
  if (digits.length === 11 && digits.startsWith("1")) {
    return digits.slice(1);
  }
  return digits;
}

/**
 * Progressive display formatting while typing.
 * Never shows errors — just formats gracefully.
 */
export function formatPhoneDisplay(raw: string): string {
  const digits = stripCountryCode(stripNonDigits(raw)).slice(0, 10);
  if (digits.length === 0) return "";
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/**
 * Final formatting on blur — produces clean display format.
 */
export function formatPhoneFinal(raw: string): string {
  const digits = stripCountryCode(stripNonDigits(raw)).slice(0, 10);
  if (digits.length < 10) return formatPhoneDisplay(raw); // keep partial
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/**
 * Convert to E.164 for database storage.
 * Returns null if not a valid 10-digit number.
 */
export function phoneToE164(raw: string): string | null {
  const digits = stripCountryCode(stripNonDigits(raw));
  if (digits.length !== 10) return null;
  return `+1${digits}`;
}

/**
 * Extract raw digits (max 10) from any input format.
 */
export function phoneDigitsOnly(raw: string): string {
  return stripCountryCode(stripNonDigits(raw)).slice(0, 10);
}

/**
 * Soft validation — true if looks like a valid 10-digit CA number.
 * Only call on blur or submit, never while typing.
 */
export function isValidPhone(raw: string): boolean {
  const digits = stripCountryCode(stripNonDigits(raw));
  return digits.length === 10;
}
