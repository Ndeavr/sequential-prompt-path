/**
 * Global website URL formatting utility.
 * 
 * Display format: example.com
 * Storage format: https://example.com
 */

import { cleanInput } from "./cleanInput";

/**
 * Clean a URL for display — removes protocol, www, trailing slash.
 */
export function formatWebsiteDisplay(raw: string): string {
  const cleaned = cleanInput(raw);
  if (!cleaned) return "";
  return cleaned
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/\/+$/, "")
    .toLowerCase();
}

/**
 * Normalize a URL for storage — ensures https:// prefix.
 * Returns empty string if input is empty.
 */
export function formatWebsiteStorage(raw: string): string {
  const display = formatWebsiteDisplay(raw);
  if (!display) return "";
  return `https://${display}`;
}

/**
 * Soft validation — checks if it looks like a domain.
 * Only call on blur or submit, never while typing.
 */
export function isValidWebsite(raw: string): boolean {
  const display = formatWebsiteDisplay(raw);
  if (!display) return false;
  // Basic domain pattern: at least one dot, no spaces
  return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+/.test(display);
}
