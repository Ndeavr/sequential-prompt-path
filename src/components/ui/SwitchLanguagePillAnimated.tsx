/**
 * SwitchLanguagePillAnimated — Ultra-compact premium language toggle.
 * Apple/Linear-inspired capsule with animated glider thumb.
 */
import { motion } from "framer-motion";

interface SwitchLanguagePillAnimatedProps {
  lang: "fr" | "en";
  onChange: (lang: "fr" | "en") => void;
  className?: string;
}

export default function SwitchLanguagePillAnimated({
  lang,
  onChange,
  className = "",
}: SwitchLanguagePillAnimatedProps) {
  const isFr = lang === "fr";

  return (
    <div
      role="radiogroup"
      aria-label="Language"
      className={`relative flex h-7 w-[52px] items-center rounded-full bg-muted/50 border border-border/30 p-[2px] cursor-pointer select-none ${className}`}
    >
      {/* Animated glider thumb */}
      <motion.div
        className="absolute top-[2px] h-[calc(100%-4px)] w-[calc(50%-1px)] rounded-full bg-primary shadow-sm"
        animate={{ left: isFr ? 2 : "calc(50% - 1px)" }}
        transition={{ type: "spring", stiffness: 500, damping: 30, mass: 0.8 }}
      />

      <button
        role="radio"
        aria-checked={isFr}
        onClick={() => onChange("fr")}
        className={`relative z-10 flex h-full w-1/2 items-center justify-center rounded-full text-[10px] font-bold tracking-wide transition-colors duration-150 ${
          isFr
            ? "text-primary-foreground"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        FR
      </button>
      <button
        role="radio"
        aria-checked={!isFr}
        onClick={() => onChange("en")}
        className={`relative z-10 flex h-full w-1/2 items-center justify-center rounded-full text-[10px] font-bold tracking-wide transition-colors duration-150 ${
          !isFr
            ? "text-primary-foreground"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        EN
      </button>
    </div>
  );
}
