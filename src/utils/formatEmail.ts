/**
 * Global email formatting utility.
 * 
 * Trims, lowercases, removes invisible characters.
 */

import { cleanInput } from "./cleanInput";

/**
 * Normalize an email — trim, lowercase, strip invisible chars.
 */
export function formatEmail(raw: string): string {
  return cleanInput(raw).toLowerCase();
}

/**
 * Soft validation — basic email pattern check.
 * Only call on blur or submit, never while typing.
 */
export function isValidEmail(raw: string): boolean {
  const cleaned = formatEmail(raw);
  if (!cleaned) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned);
}
