/**
 * HeroSectionPremium — Versatile premium hero with neural aura or light editorial background.
 */
import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface HeroSectionPremiumProps {
  overline?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  trust?: ReactNode;
  visual?: ReactNode;
  variant?: "dark" | "light";
  className?: string;
}

const ease = [0.22, 1, 0.36, 1] as const;

export function HeroSectionPremium({
  overline,
  title,
  description,
  actions,
  trust,
  visual,
  variant = "light",
  className,
}: HeroSectionPremiumProps) {
  const isDark = variant === "dark";

  return (
    <section
      className={cn(
        "relative overflow-hidden px-5 pt-20 pb-16 lg:pt-28 lg:pb-24",
        isDark ? "bg-aura-neural" : "hero-gradient",
        className
      )}
    >
      <div className="relative z-10 max-w-standard mx-auto text-center">
        {overline && (
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease }}
            className={cn(
              "text-caption font-semibold tracking-widest uppercase mb-4",
              isDark ? "text-accent/80" : "text-primary"
            )}
          >
            {overline}
          </motion.p>
        )}
        <motion.h1
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05, ease }}
          className={cn(
            "font-display text-hero sm:text-display lg:text-display-xl max-w-3xl mx-auto",
            isDark ? "text-white" : "text-foreground"
          )}
        >
          {title}
        </motion.h1>
        {description && (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.12, ease }}
            className={cn(
              "text-body-lg mt-5 max-w-xl mx-auto leading-relaxed",
              isDark ? "text-primary-foreground/70" : "text-muted-foreground"
            )}
          >
            {description}
          </motion.p>
        )}
        {actions && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2, ease }}
            className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            {actions}
          </motion.div>
        )}
        {trust && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.35 }}
            className="mt-10"
          >
            {trust}
          </motion.div>
        )}
        {visual && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.3, ease }}
            className="mt-14"
          >
            {visual}
          </motion.div>
        )}
      </div>
    </section>
  );
}
