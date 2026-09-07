/**
 * UNPRO — Single source of truth for the official brand marks.
 * All UI must reference BRAND.* — never import per-variant assets directly.
 * Never recolor, filter, stretch, crop or compose these files.
 */
import wordmarkWhiteAsset from "@/assets/brand/unpro-wordmark-white.asset.json";
import wordmarkBlueWhiteAsset from "@/assets/brand/unpro-wordmark-blue-white.asset.json";
import wordmarkBlueAsset from "@/assets/brand/unpro-wordmark-blue.asset.json";
import wordmarkNavyAsset from "@/assets/brand/unpro-wordmark-navy.asset.json";
import wordmarkWhiteBlueWhiteAsset from "@/assets/brand/unpro-wordmark-white-blue-white.asset.json";
import wordmarkBlueFilledAsset from "@/assets/brand/unpro-wordmark-blue-filled.asset.json";
import wordmarkCreamAsset from "@/assets/brand/unpro-wordmark-cream.asset.json";
import wordmarkNavyBlueAsset from "@/assets/brand/unpro-wordmark-navy-blue.asset.json";
import wordmarkNavyFilledAsset from "@/assets/brand/unpro-wordmark-navy-filled.asset.json";
import iconBlueAsset from "@/assets/brand/unpro-icon-blue.asset.json";

const absolute = (path: string) => `https://unpro.ca${path}`;
const assetUrl = (path: string) => absolute(path);

export const BRAND = {
  /** Default blue lockup — white and light surfaces. */
  logo: assetUrl(wordmarkBlueAsset.url),
  /** Full blue lockup — white and very light surfaces. */
  logoWordmarkBlue: assetUrl(wordmarkBlueAsset.url),
  /** Blue symbol with white wordmark — dark and UNPRO-blue surfaces. */
  logoWordmarkOnDark: assetUrl(wordmarkBlueWhiteAsset.url),
  /** Fully white lockup — black, photographic and very dark surfaces. */
  logoWordmarkWhite: assetUrl(wordmarkWhiteAsset.url),
  /** Navy lockup — white and very light editorial surfaces. */
  logoWordmarkNavy: assetUrl(wordmarkNavyAsset.url),
  /** Blue symbol with white fill — approved alternate. */
  logoWordmarkWhiteBlueWhite: assetUrl(wordmarkWhiteBlueWhiteAsset.url),
  /** Blue filled symbol and blue wordmark — approved alternate. */
  logoWordmarkBlueFilled: assetUrl(wordmarkBlueFilledAsset.url),
  /** Cream lockup — approved warm-dark alternate. */
  logoWordmarkCream: assetUrl(wordmarkCreamAsset.url),
  /** Navy symbol with blue fill — approved alternate. */
  logoWordmarkNavyBlue: assetUrl(wordmarkNavyBlueAsset.url),
  /** Navy filled lockup — approved alternate. */
  logoWordmarkNavyFilled: assetUrl(wordmarkNavyFilledAsset.url),
  /** Official house/chat icon — compact and square contexts only. */
  logoIconBlue: assetUrl(iconBlueAsset.url),
  logoIconWhite: assetUrl(iconBlueAsset.url),
  logoRound: assetUrl(iconBlueAsset.url),
  logoSquare: assetUrl(iconBlueAsset.url),
  /** Kept for API compatibility. */
  logoAsset: assetUrl(wordmarkBlueAsset.url),
  logoStatic: assetUrl(wordmarkBlueAsset.url),
  /** Absolute URL for schema.org / crawlers. */
  logoAbsolute: absolute(wordmarkBlueAsset.url),
  logoEmailAbsolute: absolute(wordmarkBlueAsset.url),
  /** Intrinsic dimensions of every supplied wordmark canvas (1920 x 501). */
  wordmarkRatio: 1920 / 501,
  name: "UNPRO",
} as const;
