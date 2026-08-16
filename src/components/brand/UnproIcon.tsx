/**
 * UNPRO — Icon-only (official mark)
 * Used across avatars, auth surfaces, navigation marks.
 */
import { BRAND } from "@/config/branding";

type UnproIconProps = {
  size?: number;
  /** Historical variants preserved; `shape` controls the official mark used. */
  variant?: "primary" | "mono" | "blue" | "rubber";
  shape?: "round" | "square";
  className?: string;
};

export default function UnproIcon({ size = 64, shape = "round", className = "" }: UnproIconProps) {
  return (
    <img
      src={shape === "square" ? BRAND.logoSquare : BRAND.logoRound}
      alt="UNPRO"
      width={size}
      height={size}
      className={`object-contain ${className}`}
      style={{ width: size, height: size }}
      draggable={false}
    />
  );
}
