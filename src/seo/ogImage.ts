/**
 * UNPRO — Default Open Graph image (single source of truth).
 *
 * Every page that does not explicitly generate a custom OG image MUST
 * fall back to this URL. The `?v=` query bust invalidates social crawler
 * caches (Facebook, LinkedIn, X, iMessage, Google Messages) whenever the
 * image is replaced.
 *
 * Do not import per-variant assets or legacy filenames
 * (`/og-image.jpg`, `/og-default.png`).
 */
export const DEFAULT_OG_IMAGE =
  "https://unpro.ca/og/og-unpro-fin-3-soumissions-v2.jpg?v=20260816";

export const DEFAULT_OG_IMAGE_WIDTH = 1200;
export const DEFAULT_OG_IMAGE_HEIGHT = 630;
export const DEFAULT_OG_IMAGE_ALT =
  "UNPRO — La fin des 3 soumissions. L'IA trouve le bon entrepreneur pour vos travaux.";
