/**
 * UNPRO — Icon-only (Quebec fleur-de-lys, premium 3D mark)
 * Master brand icon used across avatars, auth surfaces, navigation marks.
 */
import unproFleur from "@/assets/unpro-icon-fleur.png";

type UnproIconProps = {
  size?: number;
  variant?: "primary" | "mono" | "blue" | "rubber";
  className?: string;
};

export default function UnproIcon({ size = 64, className = "" }: UnproIconProps) {
  return (
    <img
      src={unproFleur}
      alt="UNPRO"
      width={size}
      height={size}
      className={`object-contain ${className}`}
      style={{ width: size, height: size }}
      draggable={false}
    />
  );
}
