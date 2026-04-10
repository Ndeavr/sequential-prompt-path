/**
 * WidgetGenerationQuotaStatusV2 — Displays current generation quota status.
 * Shows remaining credits, plan badge, and upgrade triggers.
 */
import { motion } from "framer-motion";
import { Sparkles, Infinity, TrendingUp } from "lucide-react";
import type { GenerationQuota } from "@/hooks/useGenerationQuota";

interface Props {
  quota: GenerationQuota;
  compact?: boolean;
  className?: string;
}

export default function WidgetGenerationQuotaStatusV2({ quota, compact = false, className = "" }: Props) {
  if (quota.isUnlimited) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <BadgeUnlimited />
        {!compact && <span className="text-xs text-muted-foreground">Générations illimitées</span>}
      </div>
    );
  }

  const percentage = quota.maxGenerations 
    ? ((quota.maxGenerations - (quota.remaining ?? 0)) / quota.maxGenerations) * 100 
    : 0;

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-medium text-foreground">
            {quota.remaining ?? 0} / {quota.maxGenerations} génération{(quota.maxGenerations ?? 0) > 1 ? "s" : ""}
          </span>
        </div>
        <BadgePlanActive planType={quota.planType} />
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${
            quota.status === "exhausted" ? "bg-destructive" 
            : quota.status === "low" ? "bg-amber-500" 
            : "bg-primary"
          }`}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>

      {/* Upgrade hint */}
      {quota.upgradeSoft && !compact && (
        <div className="flex items-center gap-1 text-[10px] text-amber-600">
          <TrendingUp className="w-3 h-3" />
          <span>Passez au plan supérieur pour plus de générations</span>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ───

function BadgePlanActive({ planType }: { planType: string }) {
  const labels: Record<string, string> = {
    decouverte: "Découverte",
    plus: "Plus",
    signature: "Signature",
  };

  const colors: Record<string, string> = {
    decouverte: "bg-muted text-muted-foreground",
    plus: "bg-primary/10 text-primary",
    signature: "bg-amber-500/10 text-amber-600",
  };

  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${colors[planType] || colors.decouverte}`}>
      {labels[planType] || planType}
    </span>
  );
}

function BadgeUnlimited() {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600">
      <Infinity className="w-3 h-3" />
      Illimité
    </span>
  );
}

export { BadgePlanActive, BadgeUnlimited };
