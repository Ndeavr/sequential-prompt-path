/**
 * UNPRO — Icon-only (official mark)
 * Used across avatars, auth surfaces, navigation marks.
 * Fallback chain: requested official mark → other official mark → "UNPRO" text.
 */
import { useState } from "react";
import { BRAND } from "@/config/branding";

type UnproIconProps = {
  size?: number;
  /** Historical variants preserved; `shape` controls the official mark used. */
  variant?: "primary" | "mono" | "blue" | "rubber";
  shape?: "round" | "square";
  className?: string;
};

export default function UnproIcon({ size = 64, shape = "round", className = "" }: UnproIconProps) {
  const [step, setStep] = useState(0);

  if (step >= 2) {
    return (
      <span
        className={`inline-flex items-center justify-center font-semibold tracking-[-0.04em] text-current ${className}`}
        style={{ fontSize: Math.max(9, Math.round(size * 0.34)), lineHeight: 1 }}
      >
        UNPRO
      </span>
    );
  }

  const primary = shape === "square" ? BRAND.logoSquare : BRAND.logoRound;
  const src = step === 0 ? primary : shape === "square" ? BRAND.logoRound : BRAND.logoSquare;

  return (
    <img
      src={src}
      alt="UNPRO"
      width={size}
      height={size}
      onError={() => setStep((s) => s + 1)}
      className={`object-contain ${className}`}
      style={{ width: size, height: size }}
      draggable={false}
    />
  );
}
