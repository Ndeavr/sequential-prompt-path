/**
 * UNPRO — Single source of truth for brand logo.
 * All UI must reference BRAND.logo / BRAND.logoSquare / BRAND.logoRound.
 * Do not import per-variant assets directly.
 */
import wordmarkAsset from "@/assets/brand/unpro-logo-wordmark.png.asset.json";
import squareAsset from "@/assets/brand/unpro-logo-square.png.asset.json";
import roundAsset from "@/assets/brand/unpro-logo-round.png.asset.json";

export const BRAND = {
  /** Official UNPRO wordmark (blue lockup, works on light and dark). */
  logo: wordmarkAsset.url,
  /** Official square app mark (blue background, rounded corners). */
  logoSquare: squareAsset.url,
  /** Official round mark (pale blue disc, blue mark). */
  logoRound: roundAsset.url,
  /** Kept for API compatibility. */
  logoAsset: wordmarkAsset.url,
  logoStatic: wordmarkAsset.url,
  /** Intrinsic wordmark dimensions (1133 x 286). */
  wordmarkRatio: 1133 / 286,
  name: "UNPRO",
} as const;
