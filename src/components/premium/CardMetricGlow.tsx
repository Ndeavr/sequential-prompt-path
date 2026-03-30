/**
 * CardMetricGlow — Premium KPI card with subtle top-border glow.
 */
import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface CardMetricGlowProps {
  label: string;
  value: string | number;
  change?: { value: string; positive?: boolean };
  icon?: ReactNode;
  className?: string;
}

export function CardMetricGlow({ label, value, change, icon, className }: CardMetricGlowProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className={cn("metric-glow-card p-5", className)}
    >
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <span className="text-caption font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
          {icon && (
            <div className="h-7 w-7 rounded-lg bg-primary/8 flex items-center justify-center text-primary">
              {icon}
            </div>
          )}
        </div>
        <div className="text-metric-lg font-display font-bold tracking-tight text-foreground">{value}</div>
        {change && (
          <div className="mt-1.5">
            <span className={cn(
              "text-caption font-semibold",
              change.positive ? "text-success" : "text-destructive"
            )}>
              {change.positive ? "↑" : "↓"} {change.value}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
