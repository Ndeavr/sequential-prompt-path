import { Crown, Check, Star, Zap, Shield, Sparkles, CalendarPlus, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import type { GoalResults } from "@/hooks/useGoalToPlanEngine";

interface Props {
  results: GoalResults;
  onActivate: () => void;
}

const PLANS = [
  { code: "recrue", label: "Recrue", icon: Zap, price: 149, includedRdv: 3, color: "border-muted-foreground/30" },
  { code: "pro", label: "Pro", icon: Star, price: 349, includedRdv: 5, color: "border-primary/30" },
  { code: "premium", label: "Premium", icon: Shield, price: 599, includedRdv: 10, color: "border-accent/30" },
  { code: "elite", label: "Élite", icon: Sparkles, price: 999, includedRdv: 25, color: "border-warning/30" },
  { code: "signature", label: "Signature", icon: Crown, price: 1799, includedRdv: 50, color: "border-secondary/30" },
];

const ADDON_PACKAGES = [
  { count: 5, pricePerRdv: 144, discount: null },
  { count: 10, pricePerRdv: 130, discount: 10 },
  { count: 25, pricePerRdv: 118, discount: 18 },
  { count: 50, pricePerRdv: 108, discount: 25 },
];

export default function SectionPlanRecommendation({ results, onActivate }: Props) {
  const navigate = useNavigate();
  const fmt = (n: number) => n.toLocaleString("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 });
  const recommended = results.recommendedPlan;
  const recPlan = PLANS.find(p => p.code === recommended);

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
                <p className="text-xs text-muted-foreground mt-1">{plan.includedRdv} RDV inclus/mois</p>
                {isRec && (
                  <Button onClick={onActivate} size="sm" className="w-full mt-4 bg-gradient-to-r from-primary to-accent text-primary-foreground">
                    Activer {plan.price}$/mo
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        {/* RDV inclus vs requis */}
        {recPlan && (
          <div className="mt-8 rounded-2xl border border-border/50 bg-card/60 p-6 max-w-lg mx-auto">
            <div className="flex items-center justify-center gap-2 mb-4">
              <CalendarPlus className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-foreground">Rendez-vous : inclus vs requis</h3>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center mb-4">
              <div className="rounded-xl bg-primary/10 p-3">
                <p className="text-2xl font-bold text-primary">{results.recommendedPlanIncludedRdv}</p>
                <p className="text-[10px] text-muted-foreground">Inclus / mois</p>
              </div>
              <div className="rounded-xl bg-muted/30 p-3">
                <p className="text-2xl font-bold text-foreground">{results.requiredAppointmentsMonthly}</p>
                <p className="text-[10px] text-muted-foreground">Requis / mois</p>
              </div>
              <div className={`rounded-xl p-3 ${results.extraRdvNeeded > 0 ? "bg-warning/10" : "bg-success/10"}`}>
                <p className={`text-2xl font-bold ${results.extraRdvNeeded > 0 ? "text-warning" : "text-success"}`}>
                  {results.extraRdvNeeded > 0 ? `+${results.extraRdvNeeded}` : "✓"}
                </p>
                <p className="text-[10px] text-muted-foreground">{results.extraRdvNeeded > 0 ? "Extra requis" : "Suffisant"}</p>
              </div>
            </div>

            {results.extraRdvNeeded > 0 && results.suggestedAddonPackage && (
              <div className="border-t border-border/30 pt-4">
                <p className="text-xs text-muted-foreground mb-3">Forfaits de rendez-vous supplémentaires</p>
                <div className="grid grid-cols-2 gap-2">
                  {ADDON_PACKAGES.map(pkg => {
                    const isSuggested = pkg.count === results.suggestedAddonPackage;
                    const total = pkg.count * pkg.pricePerRdv;
                    return (
                      <div
                        key={pkg.count}
                        className={`rounded-xl border p-3 text-center transition-all ${
                          isSuggested
                            ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                            : "border-border/30 bg-muted/10"
                        }`}
                      >
                        <p className="font-bold text-foreground">{pkg.count} RDV</p>
                        <p className="text-xs text-muted-foreground">{pkg.pricePerRdv} $/RDV</p>
                        <p className="text-sm font-semibold text-foreground mt-1">
                          {total >= 1000 ? `${(total / 1000).toFixed(1)}k` : total} $
                        </p>
                        {pkg.discount && (
                          <span className="text-[10px] text-success font-medium">-{pkg.discount}%</span>
                        )}
                        {isSuggested && (
                          <p className="text-[10px] text-primary font-semibold mt-1">Recommandé</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Projection */}
        <div className="mt-6 rounded-xl border border-border/50 bg-card/60 p-6 max-w-lg mx-auto">
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
