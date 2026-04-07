import { Crown, Check, Star, Zap, Shield, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GoalResults } from "@/hooks/useGoalToPlanEngine";

interface Props {
  results: GoalResults;
  onActivate: () => void;
}

const PLANS = [
  { code: "recrue", label: "Recrue", icon: Zap, price: 149, color: "border-muted-foreground/30" },
  { code: "pro", label: "Pro", icon: Star, price: 349, color: "border-primary/30" },
  { code: "premium", label: "Premium", icon: Shield, price: 599, color: "border-accent/30" },
  { code: "elite", label: "Élite", icon: Sparkles, price: 999, color: "border-warning/30" },
  { code: "signature", label: "Signature", icon: Crown, price: 1799, color: "border-secondary/30" },
];

export default function SectionPlanRecommendation({ results, onActivate }: Props) {
  const fmt = (n: number) => n.toLocaleString("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 });
  const recommended = results.recommendedPlan;

  return (
    <section className="py-16 px-4">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Votre plan exact</h2>
        <p className="text-muted-foreground mb-4">Basé sur vos objectifs, votre capacité et votre territoire.</p>

        {/* Confidence */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/5 mb-10">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-sm text-primary font-medium">Confiance du match : {results.planMatchConfidence}%</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {PLANS.map(plan => {
            const isRec = plan.code === recommended;
            return (
              <div
                key={plan.code}
                className={`relative rounded-2xl border p-5 transition-all ${
                  isRec
                    ? "border-primary bg-primary/10 ring-2 ring-primary/30 scale-[1.02]"
                    : `${plan.color} bg-card/60`
                }`}
              >
                {isRec && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                    Recommandé
                  </div>
                )}
                <plan.icon className={`w-6 h-6 mx-auto mb-3 ${isRec ? "text-primary" : "text-muted-foreground"}`} />
                <p className="font-bold text-foreground mb-1">{plan.label}</p>
                <p className="text-xl font-bold text-foreground">{plan.price}$<span className="text-xs text-muted-foreground">/mo</span></p>
                {isRec && (
                  <Button onClick={onActivate} size="sm" className="w-full mt-4 bg-gradient-to-r from-primary to-accent text-primary-foreground">
                    Activer
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        {/* Projection */}
        <div className="mt-8 rounded-xl border border-border/50 bg-card/60 p-6 max-w-lg mx-auto">
          <p className="text-sm text-muted-foreground mb-2">Projection avec ce plan</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Revenus projetés</p>
              <p className="font-bold text-success">{fmt(results.projectedRevenueMin)} — {fmt(results.projectedRevenueMax)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Profit projeté</p>
              <p className="font-bold text-foreground">{fmt(results.projectedProfitMin)} — {fmt(results.projectedProfitMax)}</p>
            </div>
          </div>
          {results.exclusivityPossible && (
            <p className="text-xs text-warning mt-3 flex items-center justify-center gap-1">
              <Crown className="w-3 h-3" /> Exclusivité territoriale possible
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
