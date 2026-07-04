/**
 * normalizeImageUrl — defensive URL sanitizer for <img src>.
 * Returns null when the source is unusable so callers can render a fallback
 * without triggering a broken-image request.
 */

const INVALID_LITERALS = new Set([
  "",
  "null",
  "undefined",
  "none",
  "nan",
  "false",
  "/undefined",
  "/null",
]);

export function normalizeImageUrl(src: unknown): string | null {
  if (src == null) return null;
  if (typeof src !== "string") return null;

  // Strip zero-width + control chars, trim whitespace.
  const cleaned = src.replace(/[\u200B-\u200D\uFEFF\x00-\x1F\x7F]/g, "").trim();
  if (!cleaned) return null;
  if (INVALID_LITERALS.has(cleaned.toLowerCase())) return null;

  // data:, blob:, absolute https, protocol-relative, or app-relative "/…"
  if (
    cleaned.startsWith("data:") ||
    cleaned.startsWith("blob:") ||
    cleaned.startsWith("https://") ||
    cleaned.startsWith("http://") ||
    cleaned.startsWith("//") ||
    cleaned.startsWith("/")
  ) {
    return cleaned;
  }

  // Bare host — assume https.
  if (/^[a-z0-9.-]+\.[a-z]{2,}(\/|$)/i.test(cleaned)) {
    return `https://${cleaned}`;
  }

  // Bare filename (e.g. "photo.jpg") — treat as public asset.
  if (/^[\w\-. ]+\.(png|jpe?g|webp|avif|gif|svg)$/i.test(cleaned)) {
    return `/${cleaned}`;
  }

  return null;
}

export const FALLBACK_IMAGE = "/placeholder.svg";
