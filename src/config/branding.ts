/**
 * UNPRO — Single source of truth for the official brand marks.
 * All UI must reference BRAND.* — never import per-variant assets directly.
 * Never recolor, filter, stretch, crop or compose these files.
 */
import iconPassportAsset from "@/assets/brand/unpro-icon-passport.asset.json";

const absolute = (path: string) => `https://unpro.ca${path}`;
const assetUrl = (path: string) => absolute(path);
/** Simplified 2026-09 identity — flat house/bubble symbol + large UNPRO. */
const LOGO_DARK = "/brand/unpro-logo-dark.png?v=20260925";
const LOGO_LIGHT = "/brand/unpro-logo-light.png?v=20260925";
const SYMBOL = "/brand/unpro-symbol.svg?v=20260925";

export const BRAND = {
  /** Light-surface lockup (navy text). */
  logo: LOGO_LIGHT,
  logoWordmarkBlue: LOGO_LIGHT,
  /** Dark-surface lockup (cold-silver text). */
  logoWordmarkOnDark: LOGO_DARK,
  logoWordmarkWhite: LOGO_DARK,
  logoWordmarkNavy: LOGO_LIGHT,
  logoWordmarkWhiteBlueWhite: LOGO_DARK,
  logoWordmarkBlueFilled: LOGO_LIGHT,
  logoHomeLight: LOGO_LIGHT,
  logoWordmarkGradient: LOGO_DARK,
  /** Homepage header — now the simplified dark lockup. */
  logoWordmark3D: LOGO_DARK,
  logoWordmarkCream: LOGO_DARK,
  logoWordmarkNavyBlue: LOGO_LIGHT,
  logoWordmarkNavyFilled: LOGO_LIGHT,
  /** Symbol only — compact and square contexts. */
  logoIconBlue: SYMBOL,
  /** Official house + fleur-de-lys mark — Passeport Maison sections. */
  logoIconPassport: assetUrl(iconPassportAsset.url),
  logoIconWhite: SYMBOL,
  logoRound: SYMBOL,
  logoSquare: SYMBOL,
  /** Kept for API compatibility. */
  logoAsset: LOGO_LIGHT,
  logoStatic: LOGO_LIGHT,
  /** Absolute URL for schema.org / crawlers. */
  logoAbsolute: absolute("/brand/unpro-logo-light.png"),
  logoEmailAbsolute: absolute("/brand/unpro-logo-light.png"),
  /** Intrinsic dimensions of every supplied wordmark canvas (1920 x 501). */
  wordmarkRatio: 1920 / 501,
  /** Intrinsic dimensions of the gradient wordmark canvas (1920 x 494). */
  wordmarkGradientRatio: 1920 / 494,
  /** Intrinsic dimensions of the 3D metallic lockup canvas (1634 x 510). */
  wordmark3DRatio: 1920 / 501,
  name: "UNPRO",
} as const;
