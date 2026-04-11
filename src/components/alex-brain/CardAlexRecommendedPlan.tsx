import { motion } from "framer-motion";
import { Zap, Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Plan {
  code: string;
  name: string;
  price: number;
  interval: string;
  features: string[];
  recommended?: boolean;
}

interface Props {
  plans?: Plan[];
  selectedPlan?: string;
  onSelectPlan?: (code: string) => void;
}

const DEFAULT_PLANS: Plan[] = [
  {
    code: "essentiel",
    name: "Essentiel",
    price: 149,
    interval: "mois",
    features: ["Profil public", "Jusqu'à 3 rendez-vous/mois", "Badge vérifié"],
  },
  {
    code: "pro",
    name: "Pro",
    price: 349,
    interval: "mois",
    features: ["Profil public complet", "5 à 12 rendez-vous/mois", "Visibilité améliorée", "Badge Pro"],
    recommended: true,
  },
  {
    code: "premium",
    name: "Premium",
    price: 649,
    interval: "mois",
    features: ["Visibilité maximale", "Rendez-vous illimités", "Support prioritaire", "Badge Premium"],
  },
];

export default function CardAlexRecommendedPlan({ plans = DEFAULT_PLANS, selectedPlan, onSelectPlan }: Props) {
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

      {plans.map((plan) => (
        <motion.div
          key={plan.code}
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`rounded-2xl border p-4 space-y-2 transition-colors cursor-pointer ${
            plan.recommended
              ? "border-primary/40 bg-primary/5"
              : selectedPlan === plan.code
              ? "border-primary/30 bg-primary/5"
              : "border-border/40 bg-card/80"
          }`}
          onClick={() => onSelectPlan?.(plan.code)}
        >
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-bold text-foreground">{plan.name}</span>
              {plan.recommended && (
                <span className="ml-2 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                  Recommandé
                </span>
              )}
            </div>
            <div className="text-right">
              <span className="text-lg font-extrabold text-foreground">{plan.price}$</span>
              <span className="text-xs text-muted-foreground">/{plan.interval}</span>
            </div>
          </div>
          <div className="space-y-1">
            {plan.features.map((f, i) => (
              <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Check className="h-3 w-3 text-emerald-500 shrink-0" />
                <span>{f}</span>
              </div>
            ))}
          </div>
          {(selectedPlan === plan.code || plan.recommended) && (
            <Button size="sm" className="w-full gap-1.5 rounded-xl mt-2" onClick={() => onSelectPlan?.(plan.code)}>
              Choisir {plan.name}
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          )}
        </motion.div>
      ))}
    </motion.div>
  );
}
