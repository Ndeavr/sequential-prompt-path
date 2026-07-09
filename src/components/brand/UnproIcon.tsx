/**
 * UNPRO — Icon-only (round blue speech-bubble mark)
 * Master brand icon used across avatars, auth surfaces, navigation marks.
 */
import markAsset from "@/assets/brand/unpro-logo-mark.png.asset.json";

type UnproIconProps = {
  size?: number;
  variant?: "primary" | "mono" | "blue" | "rubber";
  className?: string;
};

export default function UnproIcon({ size = 64, className = "" }: UnproIconProps) {
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
