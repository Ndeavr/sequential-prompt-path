import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Zap } from "lucide-react";
import PanelPlanCapacityProjection from "@/components/go-live/PanelPlanCapacityProjection";
import { CONTRACTOR_PLANS } from "@/config/contractorPlans";

export default function PageOnboardingPlan() {
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const handleSelectPlan = (plan: string) => {
    setSelectedPlan(plan);
  };

  const handleCheckout = () => {
    if (!selectedPlan) return;
    navigate(`/entrepreneur/onboarding/payment?plan=${selectedPlan}`);
  };

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Choisissez votre plan
          </h1>
          <p className="text-xs text-muted-foreground">Étape 3/5 — Calculez votre potentiel</p>
        </div>
      </div>

      <PanelPlanCapacityProjection />

      {/* Plan Cards */}
      <div className="space-y-3">
        {CONTRACTOR_PLANS.map((p) => ({ code: p.slug, name: p.name, price: p.monthlyPrice, appointments: p.appointmentsIncluded, color: p.featured ? "border-purple-500/30" : "border-border/50", recommended: p.featured })).map((plan) => (
          <button
            key={plan.code}
            onClick={() => handleSelectPlan(plan.code)}
            className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
              selectedPlan === plan.code
                ? "border-primary bg-primary/5"
                : plan.color + " bg-card/50 hover:bg-card/80"
            } ${plan.recommended ? "ring-1 ring-primary/20" : ""}`}
          >
            <div className="flex justify-between items-center">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-foreground">{plan.name}</span>
                  {plan.recommended && (
                    <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full">Recommandé</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Jusqu'à {plan.appointments} rendez-vous qualifiés/mois
                </p>
              </div>
              <div className="text-right">
                <span className="text-xl font-black text-foreground">{plan.price}$</span>
                <span className="text-xs text-muted-foreground">/mois</span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* CTA */}
      <div className="sticky bottom-4">
        <Button
          className="w-full"
          size="lg"
          disabled={!selectedPlan}
          onClick={handleCheckout}
        >
          {selectedPlan ? `Activer le plan ${selectedPlan}` : "Sélectionnez un plan"}
        </Button>
      </div>
    </div>
  );
}
