import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Zap } from "lucide-react";
import PanelPlanCapacityProjection from "@/components/go-live/PanelPlanCapacityProjection";
import GrowthPlanCards from "@/components/plans/GrowthPlanCards";
import TrialActivationCard from "@/components/trial/TrialActivationCard";
import { useAlexCheckoutState } from "@/stores/alexCheckoutState";
import type { ContractorPlanSlug } from "@/config/contractorPlans";
import { toast } from "sonner";

export default function PageOnboardingPlan() {
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState<ContractorPlanSlug | null>(null);
  const setStage = useAlexCheckoutState((s) => s.setStage);

  useEffect(() => {
    setStage("recommending");
    return () => setStage("idle");
  }, [setStage]);

  const handleCheckout = () => {
    if (!selectedPlan) return;
    setStage("checkout", { recommendedPlan: selectedPlan });
    navigate(`/entrepreneur/onboarding/payment?plan=${selectedPlan}`);
  };

  const handleTrial = () => {
    setStage("trial_offer");
    toast.info("L'essai 7 jours à 1 $ arrive bientôt. Vous pouvez activer un plan complet en attendant.");
  };

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 max-w-2xl mx-auto space-y-6 pb-24">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Choisissez votre rythme
          </h1>
          <p className="text-xs text-muted-foreground">Étape 3/5 — Activez votre croissance</p>
        </div>
      </div>

      <TrialActivationCard
        onActivateTrial={handleTrial}
        onSkipToStandard={() => {
          const el = document.getElementById("growth-plans");
          el?.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
      />

      <PanelPlanCapacityProjection />

      <div id="growth-plans">
        <GrowthPlanCards
          selected={selectedPlan}
          onSelect={(slug) => {
            setSelectedPlan(slug);
            setStage("recommending", { recommendedPlan: slug });
          }}
        />
      </div>

      <div className="sticky bottom-4">
        <Button
          className="w-full h-12 text-sm font-bold rounded-xl"
          size="lg"
          disabled={!selectedPlan}
          onClick={handleCheckout}
        >
          {selectedPlan ? `Activer mon plan` : "Sélectionnez un plan"}
        </Button>
      </div>
    </div>
  );
}
