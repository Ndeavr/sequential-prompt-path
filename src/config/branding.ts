/**
 * UNPRO — Single source of truth for the official brand marks.
 * All UI must reference BRAND.* — never import per-variant assets directly.
 *
 * Official set (2026-09):
 *  - Horizontal lockups (icon + wordmark), 2048 x 661
 *  - Icon-only marks, 2048 x 2048
 *  - White icon inside a blue disc: app icon / avatar / splash
 */
import wordmarkNavy from "@/assets/brand/unpro-wordmark-blue-navy.png.asset.json";
import wordmarkBlue from "@/assets/brand/unpro-wordmark-blue-blue.png.asset.json";
import wordmarkWhite from "@/assets/brand/unpro-wordmark-blue-white.png.asset.json";
import wordmarkAllWhite from "@/assets/brand/unpro-wordmark-white.png.asset.json";
import iconBlue from "@/assets/brand/unpro-icon-blue.png.asset.json";
import iconWhite from "@/assets/brand/unpro-icon-white.png.asset.json";
import iconOnBlue from "@/assets/brand/unpro-icon-white-on-blue.png.asset.json";

export const BRAND = {
  /** Default horizontal lockup (blue icon + navy wordmark) — light surfaces. */
  logo: wordmarkNavy.url,
  /** Horizontal lockup, fully blue — white / very light surfaces. */
  logoWordmarkBlue: wordmarkBlue.url,
  /** Horizontal lockup, blue icon + white wordmark — dark / blue surfaces. */
  logoWordmarkOnDark: wordmarkWhite.url,
  /** Horizontal lockup, fully white — very dark surfaces. */
  logoWordmarkWhite: wordmarkAllWhite.url,
  /** Icon only, blue — light surfaces. */
  logoIconBlue: iconBlue.url,
  /** Icon only, white — dark surfaces. */
  logoIconWhite: iconWhite.url,
  /** White icon in a blue disc — app icon, avatar, splash, square contexts. */
  logoRound: iconOnBlue.url,
  /** Square/app contexts use the same blue disc mark. */
  logoSquare: iconOnBlue.url,
  /** Kept for API compatibility. */
  logoAsset: wordmarkNavy.url,
  logoStatic: wordmarkNavy.url,
  /** Intrinsic wordmark dimensions (2048 x 661). */
  wordmarkRatio: 2048 / 661,
  name: "UNPRO",
} as const;
