/**
 * SectionPremium — Premium section wrapper with optional dark/neural aura variant.
 */
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SectionPremiumProps {
  children: ReactNode;
  className?: string;
  variant?: "default" | "muted" | "neural" | "editorial";
  narrow?: boolean;
}

export function SectionPremium({ children, className, variant = "default", narrow }: SectionPremiumProps) {
  const bg = {
    default: "",
    muted: "section-gradient",
    neural: "bg-aura-neural text-white",
    editorial: "bg-editorial-light",
  }[variant];

  return (
    <section className={cn("relative px-5 py-section lg:py-section-lg", bg, className)}>
      <div className={cn("relative z-10 mx-auto", narrow ? "max-w-narrow" : "max-w-standard")}>
        {children}
      </div>
    </section>
  );
}
