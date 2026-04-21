/**
 * UNPRO — Pricing Recommendation Card
 */
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Crown, Sparkles } from "lucide-react";
import {
  PricingRecommendation,
  BASE_PLAN_PRICES,
  getComparePlans,
  PlanCode,
} from "@/services/dynamicPricingEngine";

type Props = {
  recommendation: PricingRecommendation;
  onSelectPlan?: (plan: PlanCode, billing: string, price: number) => void;
};

export default function PricingRecommendationCard({ recommendation, onSelectPlan }: Props) {
  const { recommendedPlan, recommendedBilling, adjustedPrice, founderPrice, founderOfferVisible, rationale, urgencyLabel, pricingModifiers } = recommendation;
  const comparePlans = getComparePlans(recommendedPlan);
  const planInfo = BASE_PLAN_PRICES[recommendedPlan];

  return (
    <div className="space-y-4">
      {/* Main recommendation */}
      <div className="rounded-2xl border border-primary/30 bg-card/30 backdrop-blur-sm p-5">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-xs uppercase tracking-wider text-primary font-semibold">Plan recommandé</span>
        </div>

        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-2xl font-bold">{planInfo.name}</span>
          <Badge variant="outline" className="text-[10px]">
            {recommendedBilling === "annual" ? "Annuel" : recommendedBilling === "one_time_founder" ? "Fondateur" : "Mensuel"}
          </Badge>
        </div>

        <div className="flex items-baseline gap-2 mb-4">
          <span className="text-3xl font-bold text-foreground">{adjustedPrice.toLocaleString("fr-CA")} $</span>
          {recommendation.originalPrice && (
            <span className="text-sm text-muted-foreground line-through">{recommendation.originalPrice.toLocaleString("fr-CA")} $</span>
          )}
          <span className="text-xs text-muted-foreground">
            / {recommendedBilling === "annual" ? "an" : recommendedBilling === "one_time_founder" ? "unique" : "mois"}
          </span>
        </div>

        {/* Rationale */}
        <div className="space-y-1.5 mb-4">
          {rationale.map((r, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
              <CheckCircle2 className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
              <span>{r}</span>
            </div>
          ))}
        </div>

        <Button
          className="w-full"
          onClick={() => onSelectPlan?.(recommendedPlan, recommendedBilling, adjustedPrice)}
        >
          Activer {planInfo.name}
        </Button>
      </div>

      {/* Founder offer */}
      {founderOfferVisible && founderPrice && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 backdrop-blur-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <Crown className="w-4 h-4 text-amber-400" />
            <span className="text-xs uppercase tracking-wider text-amber-400 font-semibold">Accès fondateur</span>
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-2xl font-bold text-amber-400">{founderPrice.toLocaleString("fr-CA")} $</span>
            <span className="text-xs text-muted-foreground">paiement unique</span>
          </div>
          {urgencyLabel && <p className="text-xs text-amber-400/80 mb-3">{urgencyLabel}</p>}
          <Button
            variant="outline"
            className="w-full border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
            onClick={() => onSelectPlan?.(recommendedPlan, "one_time_founder", founderPrice)}
          >
            Réserver ma place
          </Button>
        </div>
      )}

      {/* Compare strip */}
      <div className="grid grid-cols-3 gap-2">
        {comparePlans.map(plan => {
          const info = BASE_PLAN_PRICES[plan];
          const isRec = plan === recommendedPlan;
          return (
            <div
              key={plan}
              className={`rounded-xl border p-3 text-center cursor-pointer transition-all ${
                isRec ? "border-primary/40 bg-primary/5" : "border-border/20 bg-card/10 hover:bg-muted/10"
              }`}
              onClick={() => onSelectPlan?.(plan, "monthly", info.monthly)}
            >
              <div className="text-xs font-semibold mb-1">{info.name}</div>
              <div className="text-sm font-bold">{info.monthly} $</div>
              <div className="text-[10px] text-muted-foreground">/mois</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
