import { Check, Star } from "lucide-react";
import { motion } from "framer-motion";
import { getAllPlans, type PlanTier } from "@/services/alexEntrepreneurGuidanceEngine";
import { cn } from "@/lib/utils";

interface Props {
  recommendedPlan: PlanTier;
  selectedPlan: PlanTier | null;
  onSelect: (plan: PlanTier) => void;
}

export function AlexPlanSelectorDial({ recommendedPlan, selectedPlan, onSelect }: Props) {
  const plans = getAllPlans();

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium text-muted-foreground text-center">
        Avec votre objectif, je vous recommanderais de commencer ici.
      </div>

      <div className="space-y-2">
        {plans.map((plan, i) => {
          const isRecommended = plan.tier === recommendedPlan;
          const isSelected = plan.tier === selectedPlan;

          return (
            <motion.button
              key={plan.tier}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              onClick={() => onSelect(plan.tier)}
              className={cn(
                "w-full rounded-xl border p-4 text-left transition-all relative",
                isRecommended && !isSelected && "border-primary/50 bg-primary/5",
                isSelected && "border-primary bg-primary/10 ring-2 ring-primary/30",
                !isRecommended && !isSelected && "border-border bg-card hover:border-muted-foreground/30"
              )}
            >
              {isRecommended && (
                <span className="absolute -top-2.5 right-3 text-[10px] bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                  <Star className="w-3 h-3" /> Recommandé
                </span>
              )}

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-foreground flex items-center gap-2">
                    {plan.label}
                    {isSelected && <Check className="w-4 h-4 text-primary" />}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {plan.features.slice(0, 2).join(" · ")}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-foreground">
                    {plan.price === 0 ? "Gratuit" : `${plan.price}$`}
                  </div>
                  {plan.price > 0 && (
                    <div className="text-[10px] text-muted-foreground">/mois</div>
                  )}
                </div>
              </div>

              <div className="mt-2 text-[10px] text-muted-foreground">
                Jusqu'à {plan.maxRdvMonth} rendez-vous / mois
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
