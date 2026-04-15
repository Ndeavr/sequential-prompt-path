/**
 * CardPlanComparisonInline — Premium plan comparison card for Alex chat
 */
import { motion } from "framer-motion";
import { Check, Zap, Crown, Star, Gem } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PlanDefinition } from "@/services/alexPlanTruthEngine";
import { projectRevenue } from "@/services/alexPlanTruthEngine";

interface Props {
  plans: PlanDefinition[];
  onSelectPlan?: (plan: PlanDefinition) => void;
  recommendedCode?: string;
}

const PLAN_ICONS: Record<string, React.ReactNode> = {
  pro: <Zap className="w-5 h-5" />,
  premium: <Star className="w-5 h-5" />,
  elite: <Crown className="w-5 h-5" />,
  signature: <Gem className="w-5 h-5" />,
};

const PLAN_GLOW: Record<string, string> = {
  pro: "border-blue-500/30 shadow-blue-500/10",
  premium: "border-amber-500/30 shadow-amber-500/10",
  elite: "border-purple-500/30 shadow-purple-500/10",
  signature: "border-emerald-400/30 shadow-emerald-400/10",
};

export default function CardPlanComparisonInline({ plans, onSelectPlan, recommendedCode }: Props) {
  return (
    <div className="w-full space-y-3 py-2">
      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider px-1">
        Plans UNPRO — Rendez-vous exclusifs
      </p>
      <div className="space-y-3">
        {plans.map((plan, i) => {
          const isRecommended = plan.code === recommendedCode;
          const { monthlyRevenue, roi } = projectRevenue(plan);
          const glow = PLAN_GLOW[plan.code] ?? "";

          return (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`relative rounded-xl border p-4 backdrop-blur-sm transition-all ${glow} ${
                isRecommended
                  ? "bg-primary/5 border-primary/40 shadow-lg shadow-primary/10 ring-1 ring-primary/20"
                  : "bg-card/50 border-border/50 hover:border-border"
              }`}
            >
              {isRecommended && (
                <span className="absolute -top-2.5 left-4 px-2 py-0.5 bg-primary text-primary-foreground text-[10px] font-bold uppercase rounded-full tracking-wider">
                  Recommandé
                </span>
              )}

              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-primary">{PLAN_ICONS[plan.code]}</span>
                    <h4 className="font-semibold text-foreground">{plan.name}</h4>
                  </div>
                  <p className="text-2xl font-bold text-foreground">
                    {(plan.priceMonthly / 100).toFixed(0)}
                    <span className="text-sm font-normal text-muted-foreground"> $/mois</span>
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {plan.appointmentsIncluded} rendez-vous <span className="text-primary font-medium">exclusifs</span>/mois
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <p className="text-xs text-muted-foreground">Revenu estimé</p>
                  <p className="text-lg font-bold text-emerald-400">
                    {(monthlyRevenue / 1000).toFixed(0)}k$
                    <span className="text-xs font-normal">/mois</span>
                  </p>
                  <p className="text-xs text-emerald-400/70">ROI {roi}%</p>
                </div>
              </div>

              <div className="mt-3 space-y-1">
                {plan.features.slice(0, 4).map((f, fi) => (
                  <div key={fi} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Check className="w-3 h-3 text-primary shrink-0" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>

              <p className="text-xs italic text-muted-foreground/70 mt-2">{plan.differentiator}</p>

              <Button
                size="sm"
                variant={isRecommended ? "default" : "outline"}
                className="w-full mt-3 text-xs"
                onClick={() => onSelectPlan?.(plan)}
              >
                {isRecommended ? "Activer ce plan" : "Choisir ce plan"}
              </Button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
