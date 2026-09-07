/**
 * UNPRO — Primary logo (official horizontal lockup).
 *
 * Contrast is handled automatically: the blue lockup is used on light
 * surfaces, the white lockup on dark surfaces. `tone` forces a surface
 * when a block is dark inside a light theme (or the reverse).
 *
 * Never recolored, filtered, stretched or cropped — original proportions only.
 * Fallback chain: official asset → blue disc mark → clean "UNPRO" text.
 */
import { useEffect, useState } from "react";
import { BRAND } from "@/config/branding";
import { resolveTheme, subscribeTheme, type ResolvedTheme } from "@/lib/theme/themeStore";

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
  tone?: "auto" | "light" | "dark" | "blue";
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
  // Single rendered lockup: two <img> with dark:/light: variants could both
  // stay visible when a responsive display class is passed via className.
  const [resolved, setResolved] = useState<ResolvedTheme>(() => resolveTheme());

  useEffect(() => subscribeTheme((_m, next) => setResolved(next)), []);

  const height = showWordmark ? Math.round(size / WORDMARK_RATIO) : size;

  // Last resort: clean wordmark text, never an initial badge.
  if (failed) {
    return (
      <span
        className={`inline-flex items-center font-semibold tracking-[-0.04em] text-current ${className}`}
        style={unsized ? { lineHeight: 1 } : { fontSize: Math.max(12, Math.round(height * 0.72)), lineHeight: 1 }}
      >
        UNPRO
      </span>
    );
  }

  const lightSrc = showWordmark
    ? BRAND.logoHomeLight
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

  const src =
    tone === "light"
      ? lightSrc
      : tone === "blue" && showWordmark
        ? BRAND.logoWordmarkWhite
        : tone === "dark"
          ? darkSrc
          : resolved === "dark"
            ? darkSrc
            : lightSrc;

  return (
    <img
      src={src}
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
