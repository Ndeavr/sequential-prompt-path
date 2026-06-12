/**
 * Global email formatting utility — delegates to normalizeInput.
 */
import { normalizeInput } from "./normalizeInput";

export function formatEmail(raw: string): string {
  return normalizeInput(raw, "email").value;
}

export function isValidEmail(raw: string): boolean {
  if (!raw?.trim()) return false;
  return normalizeInput(raw, "email").valid;
}
