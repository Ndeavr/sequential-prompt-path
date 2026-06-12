/**
 * Canadian postal code helpers — delegates to normalizeInput.
 */
import { normalizeInput } from "./normalizeInput";

export function normalizePostal(raw: string): string {
  return normalizeInput(raw, "postal_code").value;
}

export function isValidPostal(raw: string): boolean {
  if (!raw?.trim()) return false;
  return normalizeInput(raw, "postal_code").valid;
}

export function formatPostalDisplay(raw: string): string {
  return normalizeInput(raw, "postal_code").display;
}
