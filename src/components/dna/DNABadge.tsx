/**
 * UNPRO — DNA Badge
 * Displays a homeowner or contractor DNA type with premium styling.
 */

import { motion } from "framer-motion";
import { Brain, Sparkles } from "lucide-react";

interface DNABadgeProps {
  dnaType: string;
  dnaLabelFr: string;
  confidence: number;
  variant?: "homeowner" | "contractor";
  size?: "sm" | "md" | "lg";
}

const VARIANT_STYLES = {
  homeowner: {
    bg: "bg-primary/8 border-primary/20",
    text: "text-primary",
    glow: "shadow-[0_0_20px_hsl(var(--primary)/0.12)]",
    icon: Brain,
  },
  contractor: {
    bg: "bg-secondary/8 border-secondary/20",
    text: "text-secondary",
    glow: "shadow-[0_0_20px_hsl(var(--secondary)/0.12)]",
    icon: Sparkles,
  },
};

const SIZE_CLASSES = {
  sm: "px-2.5 py-1 text-xs gap-1.5",
  md: "px-3.5 py-1.5 text-sm gap-2",
  lg: "px-4 py-2 text-base gap-2.5",
};

export default function DNABadge({
  dnaLabelFr,
  confidence,
  variant = "homeowner",
  size = "md",
}: DNABadgeProps) {
  const style = VARIANT_STYLES[variant];
  const Icon = style.icon;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`inline-flex items-center rounded-full border backdrop-blur-sm ${style.bg} ${style.glow} ${SIZE_CLASSES[size]}`}
    >
      <Icon className={`${size === "sm" ? "h-3 w-3" : size === "lg" ? "h-5 w-5" : "h-4 w-4"} ${style.text}`} />
      <span className={`font-semibold ${style.text}`}>{dnaLabelFr}</span>
      {confidence >= 70 && (
        <span className="text-muted-foreground opacity-60 text-[10px] font-medium ml-1">
          {Math.round(confidence)}%
        </span>
      )}
    </motion.div>
  );
}
