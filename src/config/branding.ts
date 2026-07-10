/**
 * UNPRO — Single source of truth for brand logo.
 * All UI must reference BRAND.logo. Do not import per-variant assets.
 */
import logoAsset from "@/assets/brand/unpro-logo-blue.png.asset.json";

export const BRAND = {
  /** Official UNPRO wordmark (blue speech-bubble). */
  logo: "/assets/branding/unpro-logo.png",
  /** CDN asset pointer for environments that resolve the asset pipeline. */
  logoAsset: logoAsset.url,
  /** Static fallback for local/preview environments. */
  logoStatic: "/assets/branding/unpro-logo.png",
  name: "UNPRO",
} as const;
