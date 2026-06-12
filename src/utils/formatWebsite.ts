/**
 * Global website URL formatting utility — delegates to normalizeInput.
 *
 * Display: example.com   Storage: https://example.com
 */
import { normalizeInput } from "./normalizeInput";

export function formatWebsiteDisplay(raw: string): string {
  return normalizeInput(raw, "url").display;
}

export function formatWebsiteStorage(raw: string): string {
  const r = normalizeInput(raw, "url");
  return r.value;
}

export function isValidWebsite(raw: string): boolean {
  if (!raw?.trim()) return false;
  return normalizeInput(raw, "url").valid;
}
