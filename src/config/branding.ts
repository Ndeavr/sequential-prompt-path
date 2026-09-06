/**
 * UNPRO — Single source of truth for the official brand marks.
 * All UI must reference BRAND.* — never import per-variant assets directly.
 *
 * Official set (2026-09), served from `public/assets/brand/`:
 *  - Horizontal lockups (icon + wordmark), ratio 2048 x 661
 *  - Icon-only marks (transparent), blue or white
 *  - White icon inside a blue disc: app icon / avatar / splash / square
 *
 * Never recolor, filter, stretch or crop these files.
 */
const BASE = "/assets/brand";

export const BRAND = {
  /** Default horizontal lockup (blue icon + navy wordmark) — light surfaces. */
  logo: `${BASE}/unpro-wordmark-blue-navy.png`,
  /** Horizontal lockup, fully blue — white / very light surfaces. */
  logoWordmarkBlue: `${BASE}/unpro-wordmark-blue-blue.png`,
  /** Horizontal lockup, blue icon + white wordmark — dark / blue surfaces. */
  logoWordmarkOnDark: `${BASE}/unpro-wordmark-blue-white.png`,
  /** Horizontal lockup, fully white — very dark surfaces. */
  logoWordmarkWhite: `${BASE}/unpro-wordmark-white.png`,
  /** Icon only, blue — light surfaces. */
  logoIconBlue: `${BASE}/unpro-icon-blue.png`,
  /** Icon only, white — dark surfaces. */
  logoIconWhite: `${BASE}/unpro-icon-white.png`,
  /** White icon in a blue disc — app icon, avatar, splash, square contexts. */
  logoRound: `${BASE}/unpro-icon-white-on-blue.png`,
  /** Square/app contexts use the same blue disc mark. */
  logoSquare: `${BASE}/unpro-icon-white-on-blue.png`,
  /** Kept for API compatibility. */
  logoAsset: `${BASE}/unpro-wordmark-blue-navy.png`,
  logoStatic: `${BASE}/unpro-wordmark-blue-navy.png`,
  /** Absolute URL for schema.org / crawlers. */
  logoAbsolute: `https://unpro.ca${BASE}/unpro-wordmark-blue-navy.png`,
  /** Intrinsic wordmark dimensions (2048 x 661). */
  wordmarkRatio: 2048 / 661,
  name: "UNPRO",
} as const;
