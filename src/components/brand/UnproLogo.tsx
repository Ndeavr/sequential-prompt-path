/**
 * UNPRO — Primary Logo (official wordmark lockup)
 * `showWordmark={false}` falls back to the official round / square mark.
 */
import { BRAND } from "@/config/branding";

type UnproLogoProps = {
  size?: number;
  /** Historical variants are preserved; all resolve to the official lockup. */
  variant?: "primary" | "blue" | "mono" | "mono-invert" | "rubber";
  /** Kept for API compatibility; the master lockup is a static image. */
  animated?: boolean;
  showWordmark?: boolean;
  /** Mark shape when the wordmark is hidden. */
  markShape?: "round" | "square";
  className?: string;
};

const WORDMARK_RATIO = BRAND.wordmarkRatio;

export default function UnproLogo({
  size = 320,
  showWordmark = true,
  markShape = "round",
  className = "",
}: UnproLogoProps) {
  if (!showWordmark) {
    return (
      <img
        src={markShape === "square" ? BRAND.logoSquare : BRAND.logoRound}
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
      src={BRAND.logo}
      alt="UNPRO"
      width={size}
      height={height}
      className={`object-contain ${className}`}
      style={{ width: size, height }}
      draggable={false}
    />
  );
}
