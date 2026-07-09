/**
 * UNPRO — Single source of truth for brand logo.
 * All UI must reference BRAND.logo. Do not import per-variant assets.
 */
import logoAsset from "@/assets/brand/unpro-logo-blue.png.asset.json";

export const BRAND = {
  /** Official UNPRO wordmark (blue speech-bubble). CDN-served. */
  logo: logoAsset.url,
  /** Also available at /assets/branding/unpro-logo.png as a static fallback. */
  logoStatic: "/assets/branding/unpro-logo.png",
  name: "UNPRO",
} as const;
