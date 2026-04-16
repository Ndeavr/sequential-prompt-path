/**
 * UNPRO — Icon-only (House+U premium logo)
 * Uses the official house-U logo image asset.
 */
import unproLogoHouse from "@/assets/unpro-logo-house.png";

type UnproIconProps = {
  size?: number;
  variant?: "primary" | "mono" | "blue" | "rubber";
  className?: string;
};

export default function UnproIcon({ size = 64, className = "" }: UnproIconProps) {
  return (
    <img
      src={unproLogoHouse}
      alt="UNPRO"
      width={size}
      height={size}
      className={`object-contain ${className}`}
      style={{ width: size, height: size }}
      draggable={false}
    />
  );
}
