/**
 * UNPRO — Primary Logo (Quebec fleur-de-lys + UNPRO wordmark)
 * Renders the master PNG lockup. `showWordmark={false}` falls back to the icon-only fleur.
 */
import unproMaster from "@/assets/unpro-logo-master-transparent.png";
import unproFleur from "@/assets/unpro-icon-fleur.png";

type UnproLogoProps = {
  size?: number;
  variant?: "primary" | "mono" | "blue" | "rubber";
  /** Kept for API compatibility; the master lockup is a static image. */
  animated?: boolean;
  showWordmark?: boolean;
  className?: string;
};

const variantFilter: Record<NonNullable<UnproLogoProps["variant"]>, string | undefined> = {
  primary: undefined,
  blue: "hue-rotate(-5deg) saturate(1.15)",
  mono: "grayscale(1) brightness(1.6) contrast(1.1)",
  rubber: "grayscale(1) brightness(0.55) contrast(1.05)",
};

export default function UnproLogo({
  size = 320,
  variant = "primary",
  showWordmark = true,
  className = "",
}: UnproLogoProps) {
  if (!showWordmark) {
    return (
      <img
        src={unproFleur}
        alt="UNPRO"
        width={size}
        height={size}
        className={`object-contain ${className}`}
        style={{
          width: size,
          height: size,
          filter: variantFilter[variant],
        }}
        draggable={false}
      />
    );
  }

  // Master lockup aspect: 1672 x 941 ≈ 1.776
  const height = Math.round(size / 1.776);
  return (
    <img
      src={unproMaster}
      alt="UNPRO"
      width={size}
      height={height}
      className={`object-contain ${className}`}
      style={{
        width: size,
        height,
        filter: variantFilter[variant],
      }}
      draggable={false}
    />
  );
}
