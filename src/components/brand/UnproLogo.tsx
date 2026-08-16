/**
 * UNPRO — Primary Logo (official wordmark lockup)
 * `showWordmark={false}` falls back to the official round / square mark.
 * Fallback chain: official asset → other official variant → clean "UNPRO" text.
 * Never a generated avatar or single-letter badge.
 */
import { useState } from "react";
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
  const [step, setStep] = useState(0);

  const height = showWordmark ? Math.round(size / WORDMARK_RATIO) : size;

  // Last resort: clean wordmark text, never an initial badge.
  if (step >= 2) {
    return (
      <span
        className={`inline-flex items-center font-semibold tracking-[-0.04em] text-current ${className}`}
        style={{ fontSize: Math.max(12, Math.round(height * 0.72)), lineHeight: 1 }}
      >
        UNPRO
      </span>
    );
  }

  const primarySrc = showWordmark
    ? BRAND.logo
    : markShape === "square"
      ? BRAND.logoSquare
      : BRAND.logoRound;
  const src = step === 0 ? primarySrc : BRAND.logoRound;
  const isMark = step === 1 || !showWordmark;

  return (
    <img
      src={src}
      alt="UNPRO"
      width={isMark ? (step === 1 ? height : size) : size}
      height={isMark ? (step === 1 ? height : size) : height}
      onError={() => setStep((s) => s + 1)}
      className={`object-contain ${className}`}
      style={
        isMark && step === 1
          ? { width: height, height }
          : { width: size, height: isMark ? size : height }
      }
      draggable={false}
    />
  );
}
