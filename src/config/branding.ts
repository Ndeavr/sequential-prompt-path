/**
 * UNPRO — Single source of truth for brand logo.
 * All UI must reference BRAND.logo. Do not import per-variant assets.
 */
import logoAsset from "@/assets/brand/unpro-logo-blue.png.asset.json";

export const BRAND = {
  /** Official UNPRO sticker (CDN-hosted, single source of truth). */
  logo: logoAsset.url,
  /** CDN asset pointer for environments that resolve the asset pipeline. */
  logoAsset: logoAsset.url,
  /** Static fallback (kept for API compatibility — now points to the CDN URL). */
  logoStatic: logoAsset.url,
  name: "UNPRO",
} as const;
