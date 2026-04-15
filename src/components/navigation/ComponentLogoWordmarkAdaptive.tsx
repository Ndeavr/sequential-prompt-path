/**
 * UNPRO — Adaptive Logo + Wordmark Component
 * Variants: icon-only | standard | maximized
 */
import unproLogoWordmark from "@/assets/unpro-logo-wordmark.png";
import unproLogoIcon from "@/assets/unpro-logo.png";

type LogoVariant = "icon-only" | "standard" | "maximized";

interface ComponentLogoWordmarkAdaptiveProps {
  variant?: LogoVariant;
  className?: string;
}

const variantClasses: Record<LogoVariant, { img: string; useWordmark: boolean }> = {
  "icon-only": { img: "h-8 w-auto", useWordmark: false },
  standard: { img: "h-9 w-auto", useWordmark: true },
  maximized: { img: "h-10 w-auto", useWordmark: true },
};

export default function ComponentLogoWordmarkAdaptive({
  variant = "standard",
  className = "",
}: ComponentLogoWordmarkAdaptiveProps) {
  const config = variantClasses[variant];

  return (
    <div className={`flex items-center ${className}`}>
      {config.useWordmark ? (
        <img
          src={unproLogoWordmark}
          alt="UNPRO"
          className={`${config.img} object-contain`}
          draggable={false}
        />
      ) : (
        <img
          src={unproLogoIcon}
          alt="UNPRO"
          className={`${config.img} object-contain`}
          draggable={false}
        />
      )}
    </div>
  );
}
