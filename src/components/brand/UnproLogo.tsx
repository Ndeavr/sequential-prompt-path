/**
 * UNPRO — Primary logo (official horizontal lockup).
 *
 * Contrast is handled automatically: the navy-text lockup is used on light
 * surfaces, the white-text lockup on dark surfaces. `tone` forces a surface
 * when a block is dark inside a light theme (or the reverse).
 *
 * Never recolored, filtered, stretched or cropped — original proportions only.
 * Fallback chain: official asset → blue disc mark → clean "UNPRO" text.
 */
import { useState } from "react";
import { BRAND } from "@/config/branding";

type UnproLogoProps = {
  size?: number;
  /** Historical variants preserved for API compatibility. */
  variant?: "primary" | "blue" | "mono" | "mono-invert" | "rubber";
  /** Kept for API compatibility; the lockup is a static image. */
  animated?: boolean;
  showWordmark?: boolean;
  /** Mark shape when the wordmark is hidden. */
  markShape?: "round" | "square" | "bare";
  /** Surface the logo sits on. `auto` follows the app theme. */
  tone?: "auto" | "light" | "dark";
  /** Skip inline width/height so CSS classes control the size. */
  unsized?: boolean;
  className?: string;
};

const WORDMARK_RATIO = BRAND.wordmarkRatio;

export default function UnproLogo({
  size = 320,
  showWordmark = true,
  markShape = "round",
  tone = "auto",
  unsized = false,
  className = "",
}: UnproLogoProps) {
  const [failed, setFailed] = useState(false);

  const height = showWordmark ? Math.round(size / WORDMARK_RATIO) : size;

  // Last resort: clean wordmark text, never an initial badge.
  if (failed) {
    return (
      <span
        className={`inline-flex items-center font-semibold tracking-[-0.04em] text-current ${className}`}
        style={{ fontSize: Math.max(12, Math.round(height * 0.72)), lineHeight: 1 }}
      >
        UNPRO
      </span>
    );
  }

  const lightSrc = showWordmark
    ? BRAND.logo
    : markShape === "bare"
      ? BRAND.logoIconBlue
      : BRAND.logoRound;
  const darkSrc = showWordmark
    ? BRAND.logoWordmarkOnDark
    : markShape === "bare"
      ? BRAND.logoIconWhite
      : BRAND.logoRound;

  const style = unsized
    ? undefined
    : { width: size, height: showWordmark ? height : size };
  const base = `object-contain ${className}`;

  if (tone !== "auto") {
    return (
      <img
        src={tone === "dark" ? darkSrc : lightSrc}
        alt="UNPRO"
        width={size}
        height={showWordmark ? height : size}
        onError={() => setFailed(true)}
        className={base}
        style={style}
        draggable={false}
      />
    );
  }

  return (
    <>
      <img
        src={lightSrc}
        alt="UNPRO"
        width={size}
        height={showWordmark ? height : size}
        onError={() => setFailed(true)}
        className={`${base} dark:hidden`}
        style={style}
        draggable={false}
      />
      <img
        src={darkSrc}
        alt=""
        aria-hidden="true"
        width={size}
        height={showWordmark ? height : size}
        onError={() => setFailed(true)}
        className={`${base} hidden dark:block`}
        style={style}
        draggable={false}
      />
    </>
  );
}
