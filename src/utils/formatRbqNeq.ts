/**
 * RBQ / NEQ helpers — delegates to normalizeInput.
 */
import { normalizeInput } from "./normalizeInput";

export function normalizeRbq(raw: string): string {
  return normalizeInput(raw, "rbq").value;
}
export function isValidRbq(raw: string): boolean {
  if (!raw?.trim()) return false;
  return normalizeInput(raw, "rbq").valid;
}
export function normalizeNeq(raw: string): string {
  return normalizeInput(raw, "neq").value;
}
export function isValidNeq(raw: string): boolean {
  if (!raw?.trim()) return false;
  return normalizeInput(raw, "neq").valid;
}
