/**
 * UNPRO — Icon-only official mark.
 * Used for avatars, auth surfaces, app/square contexts and narrow navigation.
 *
 * Every compact shape uses the untouched official house/chat icon.
 * Fallback: official mark → "UNPRO" text. Never a generated initial badge.
 */
import { useState } from "react";
import { BRAND } from "@/config/branding";

type UnproIconProps = {
  size?: number;
  /** Historical variants preserved for API compatibility. */
  variant?: "primary" | "mono" | "blue" | "rubber";
  shape?: "round" | "square" | "bare";
  /** Kept for API compatibility; the official icon is valid on both themes. */
  tone?: "auto" | "light" | "dark";
  /** Skip inline width/height so CSS classes control the size. */
  unsized?: boolean;
  className?: string;
};

export default function UnproIcon({
  size = 64,
  shape = "round",
  tone = "auto",
  unsized = false,
  className = "",
}: UnproIconProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span
        className={`inline-flex items-center justify-center font-semibold tracking-[-0.04em] text-current ${className}`}
        style={{ fontSize: Math.max(9, Math.round(size * 0.34)), lineHeight: 1 }}
      >
        UNPRO
      </span>
    );
  }

  const style = unsized ? undefined : { width: size, height: size };
  const base = `object-contain ${className}`;

  if (shape !== "bare") {
    return (
      <img
        src={BRAND.logoRound}
        alt="UNPRO"
        width={size}
        height={size}
        onError={() => setFailed(true)}
        className={base}
        style={style}
        draggable={false}
      />
    );
  }

  return (
    <img
      src={BRAND.logoIconBlue}
      alt="UNPRO"
      width={size}
      height={size}
      onError={() => setFailed(true)}
      className={base}
      style={style}
      draggable={false}
    />
  );
}
