/**
 * IndicatorRemainingCreditsV2 — Compact inline indicator showing remaining credits.
 * Use in headers, toolbars, or generation buttons.
 */
import { Sparkles, Infinity } from "lucide-react";
import { motion } from "framer-motion";
import type { QuotaStatus } from "@/hooks/useGenerationQuota";

interface Props {
  remaining: number | null;
  maxGenerations: number | null;
  status: QuotaStatus;
  className?: string;
}

export default function IndicatorRemainingCreditsV2({ remaining, maxGenerations, status, className = "" }: Props) {
  if (status === "unlimited") {
    return (
      <span className={`inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 ${className}`}>
        <Infinity className="w-3 h-3" />
        Illimité
      </span>
    );
  }

  const colorClass = 
    status === "exhausted" ? "text-destructive" 
    : status === "low" ? "text-amber-500" 
    : "text-primary";

  return (
    <motion.span
      key={remaining}
      initial={{ scale: 1.2 }}
      animate={{ scale: 1 }}
      className={`inline-flex items-center gap-1 text-[11px] font-medium ${colorClass} ${className}`}
    >
      <Sparkles className="w-3 h-3" />
      {remaining ?? 0} / {maxGenerations ?? 0}
    </motion.span>
  );
}
