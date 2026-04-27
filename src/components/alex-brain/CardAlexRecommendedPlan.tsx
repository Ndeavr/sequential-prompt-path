/**
 * CardAlexRecommendedPlan — Inline plan selector for Alex chat.
 *
 * SOURCE OF TRUTH: src/config/pricing.ts (CONTRACTOR_PLANS).
 * Never hardcode plan names — that triggers the legacyPlanGuard.
 */

import { motion } from "framer-motion";
import { Zap, Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CONTRACTOR_PLANS, type ContractorPlanSlug } from "@/config/pricing";

interface Props {
  /** Optional override list. Defaults to canonical CONTRACTOR_PLANS (top 3). */
  selectedPlan?: ContractorPlanSlug;
  onSelectPlan?: (code: ContractorPlanSlug) => void;
  /** How many plans to show (defaults to 3 — pro/premium/elite range). */
  visibleCount?: number;
}

export default function CardAlexRecommendedPlan({
  selectedPlan,
  onSelectPlan,
  visibleCount = 3,
}: Props) {
  // Show the most relevant tier (skip "recrue" — too entry-level for Alex's
  // recommendation surface) up to `visibleCount`.
  const plans = CONTRACTOR_PLANS.filter((p) => p.slug !== "recrue").slice(0, visibleCount);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      <div className="flex items-center gap-2 px-1">
        <Zap className="h-4 w-4 text-primary" />
        <p className="text-sm font-semibold text-foreground">Choisissez votre plan</p>
      </div>

      {plans.map((plan) => {
        const isRecommended = plan.featured;
        const isSelected = selectedPlan === plan.slug;
        return (
          <motion.div
            key={plan.slug}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`rounded-2xl border p-4 space-y-2 transition-colors cursor-pointer ${
              isRecommended
                ? "border-primary/40 bg-primary/5"
                : isSelected
                ? "border-primary/30 bg-primary/5"
                : "border-border/40 bg-card/80"
            }`}
            onClick={() => onSelectPlan?.(plan.slug)}
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-bold text-foreground">{plan.name}</span>
                {isRecommended && (
                  <span className="ml-2 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                    Recommandé
                  </span>
                )}
              </div>
              <div className="text-right">
                <span className="text-lg font-extrabold text-foreground">{plan.monthlyPrice}$</span>
                <span className="text-xs text-muted-foreground">/mois</span>
              </div>
            </div>
            <div className="space-y-1">
              {plan.features.slice(0, 4).map((f, i) => (
                <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Check className="h-3 w-3 text-emerald-500 shrink-0" />
                  <span>{f}</span>
                </div>
              ))}
            </div>
            {(isSelected || isRecommended) && (
              <Button size="sm" className="w-full gap-1.5 rounded-xl mt-2" onClick={() => onSelectPlan?.(plan.slug)}>
                Choisir {plan.name}
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            )}
          </motion.div>
        );
      })}
    </motion.div>
  );
}
