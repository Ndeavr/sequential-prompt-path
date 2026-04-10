/**
 * BannerUpgradePromptV2 — Subtle upgrade banner shown when credits are low.
 * Two modes: soft (1 credit left) and aggressive (0 credits).
 */
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import type { QuotaStatus } from "@/hooks/useGenerationQuota";

interface Props {
  status: QuotaStatus;
  remaining: number | null;
  maxGenerations: number | null;
  planType: string;
  onUpgrade?: () => void;
  className?: string;
}

export default function BannerUpgradePromptV2({ status, remaining, maxGenerations, planType, onUpgrade, className = "" }: Props) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || status === "available" || status === "unlimited") return null;

  const isExhausted = status === "exhausted";
  const planLabel = planType === "decouverte" ? "Découverte" : planType === "plus" ? "Plus" : "Signature";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className={`rounded-xl border px-4 py-3 ${
          isExhausted
            ? "bg-destructive/5 border-destructive/20"
            : "bg-amber-500/5 border-amber-500/20"
        } ${className}`}
      >
        <div className="flex items-start gap-3">
          <Sparkles className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isExhausted ? "text-destructive" : "text-amber-500"}`} />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground">
              {isExhausted
                ? `Vos ${maxGenerations} générations ${planLabel} sont épuisées`
                : `Plus qu'une génération restante sur votre plan ${planLabel}`
              }
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {isExhausted
                ? "Passez au plan supérieur pour continuer à visualiser vos projets."
                : "Pensez à passer au plan supérieur pour ne pas être limité."
              }
            </p>
            {onUpgrade && (
              <Button
                size="sm"
                variant={isExhausted ? "default" : "outline"}
                className="mt-2 rounded-full gap-1 text-[11px] h-7 px-3"
                onClick={onUpgrade}
              >
                Voir les plans <ArrowRight className="w-3 h-3" />
              </Button>
            )}
          </div>
          {!isExhausted && (
            <button onClick={() => setDismissed(true)} className="text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
