/**
 * UNPRO — Primary Logo (wordmark + speech-bubble mark)
 * Renders the master UNPRO wordmark. `showWordmark={false}` falls back to the round mark.
 */
import blueAsset from "@/assets/brand/unpro-logo-blue.png.asset.json";
import blackAsset from "@/assets/brand/unpro-logo-black.png.asset.json";
import whiteAsset from "@/assets/brand/unpro-logo-white.png.asset.json";
import greyAsset from "@/assets/brand/unpro-logo-grey.png.asset.json";
import markAsset from "@/assets/brand/unpro-logo-mark.png.asset.json";

type UnproLogoProps = {
  size?: number;
  variant?: "primary" | "blue" | "mono" | "mono-invert" | "rubber";
  /** Kept for API compatibility; the master lockup is a static image. */
  animated?: boolean;
  showWordmark?: boolean;
  className?: string;
};

const variantSrc: Record<NonNullable<UnproLogoProps["variant"]>, string> = {
  primary: blueAsset.url,
  blue: blueAsset.url,
  mono: blackAsset.url,
  "mono-invert": whiteAsset.url,
  rubber: greyAsset.url,
};

// New wordmark aspect ≈ 1160 x 270 ≈ 4.3
const WORDMARK_RATIO = 4.3;

export default function UnproLogo({
  size = 320,
  variant = "primary",
  showWordmark = true,
  className = "",
}: UnproLogoProps) {
  if (!showWordmark) {
    return (
      <img
        src={markAsset.url}
        alt="UNPRO"
        width={size}
        height={size}
        className={`object-contain ${className}`}
        style={{ width: size, height: size }}
        draggable={false}
      />
    );
  }

  const height = Math.round(size / WORDMARK_RATIO);
  return (
    <img
      src={variantSrc[variant] ?? blueAsset.url}
      alt="UNPRO"
      width={size}
      height={height}
      className={`object-contain ${className}`}
      style={{ width: size, height }}
      draggable={false}
    />
  );
}
