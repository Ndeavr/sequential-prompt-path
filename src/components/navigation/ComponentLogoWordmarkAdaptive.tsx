/**
 * UNPRO — Adaptive Logo + Wordmark Component
 * Master fleur-de-lys lockup. Variants: icon-only | standard | maximized
 */
import unproMaster from "@/assets/unpro-logo-master-transparent.png";
import unproFleur from "@/assets/unpro-icon-fleur.png";

type LogoVariant = "icon-only" | "standard" | "maximized";

interface ComponentLogoWordmarkAdaptiveProps {
  variant?: LogoVariant;
  className?: string;
}

const variantClasses: Record<LogoVariant, { img: string; useWordmark: boolean }> = {
  "icon-only": { img: "h-10 w-auto", useWordmark: false },
  standard: { img: "h-12 w-auto", useWordmark: true },
  maximized: { img: "h-14 w-auto max-w-[220px]", useWordmark: true },
};

export default function ComponentLogoWordmarkAdaptive({
  variant = "standard",
  className = "",
}: ComponentLogoWordmarkAdaptiveProps) {
  const config = variantClasses[variant];

  return (
    <div className={`flex items-center ${className}`}>
      <img
        src={config.useWordmark ? unproMaster : unproFleur}
        alt="UNPRO"
        className={`${config.img} object-contain`}
        draggable={false}
      />
    </div>
  );
}
