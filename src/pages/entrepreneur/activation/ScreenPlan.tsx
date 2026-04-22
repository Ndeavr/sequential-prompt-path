/**
 * Screen 7 — Plan Recommendation
 * AI recommendation + plan cards + social proof + sticky CTA.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Check, Sparkles, Star, ChevronDown, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import FunnelLayout from "@/components/contractor-funnel/FunnelLayout";
import { useActivationFunnel } from "@/hooks/useActivationFunnel";
import { useHesitationRescue } from "@/hooks/useHesitationRescue";
import StickyMobileCTA from "@/components/ui/StickyMobileCTA";

const PLANS = [
  {
    code: "pro",
    name: "Pro",
    price_monthly: 149,
    price_yearly: 119,
    appointments: 5,
    features: ["Profil UNPRO vérifié", "5 rendez-vous/mois", "Score AIPP de base", "Support courriel"],
    recommended: false,
  },
  {
    code: "premium",
    name: "Premium",
    price_monthly: 299,
    price_yearly: 249,
    appointments: 15,
    features: ["Tout de Pro", "15 rendez-vous/mois", "Score AIPP avancé", "Calendrier intégré", "Visibilité IA prioritaire", "Support prioritaire"],
    recommended: true,
    socialProof: "Choisi par 68% des entrepreneurs",
  },
  {
    code: "elite",
    name: "Élite",
    price_monthly: 499,
    price_yearly: 399,
    appointments: 30,
    features: ["Tout de Premium", "30 rendez-vous/mois", "Exclusivité territoriale", "Badge vérifié", "Alex dédié", "Optimisation continue"],
    recommended: false,
  },
];

export default function ScreenPlan() {
  const navigate = useNavigate();
  const { state, updateFunnel } = useActivationFunnel();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("yearly");
  const [selectedPlan, setSelectedPlan] = useState(state.selected_plan || "premium");
  const [showWhy, setShowWhy] = useState(false);
  useHesitationRescue({ screenKey: "plan" });

  const handleSelectPlan = async (planCode: string) => {
    setSelectedPlan(planCode);
    await updateFunnel({ selected_plan: planCode, billing_cycle: billingCycle });
  };

  const handleContinue = () => {
    updateFunnel({ selected_plan: selectedPlan, billing_cycle: billingCycle });
    navigate("/entrepreneur/activer/paiement");
  };

  return (
    <FunnelLayout currentStep="plan_recommendation" showProgress={false}>
      <div className="max-w-lg mx-auto pb-28 sm:pb-0">
        {/* AI recommendation */}
        <motion.div
          className="rounded-xl border border-primary/30 bg-primary/5 p-4 mb-4 flex items-start gap-3"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Sparkles className="w-5 h-5 text-primary mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">
              Selon votre territoire et votre capacité, le meilleur plan est{" "}
              <span className="text-primary font-bold">Premium</span>
            </p>
            <button
              onClick={() => setShowWhy(!showWhy)}
              className="text-xs text-primary/70 hover:text-primary mt-1 flex items-center gap-1"
            >
              Pourquoi Premium?
              <ChevronDown className={cn("w-3 h-3 transition-transform", showWhy && "rotate-180")} />
            </button>
            {showWhy && (
              <motion.ul
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="mt-2 space-y-1 text-xs text-muted-foreground"
              >
                <li>• Forte demande dans votre territoire</li>
                <li>• Plusieurs services sélectionnés</li>
                <li>• Calendrier de rendez-vous activé</li>
                <li>• Visibilité IA prioritaire incluse</li>
              </motion.ul>
            )}
          </div>
        </motion.div>

        {/* Social proof */}
        <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground mb-4">
          <Users className="w-3.5 h-3.5" />
          <span>147 profils activés ce mois</span>
        </div>

        {/* Billing toggle */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <button
            onClick={() => setBillingCycle("monthly")}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all",
              billingCycle === "monthly" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            )}
          >
            Mensuel
          </button>
          <button
            onClick={() => setBillingCycle("yearly")}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all",
              billingCycle === "yearly" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            )}
          >
            Annuel <span className="text-xs opacity-80">-20%</span>
          </button>
        </div>

        {/* Plan cards */}
        <div className="space-y-3 mb-6">
          {PLANS.map((plan) => {
            const price = billingCycle === "yearly" ? plan.price_yearly : plan.price_monthly;
            const isSelected = selectedPlan === plan.code;

            return (
              <motion.button
                key={plan.code}
                onClick={() => handleSelectPlan(plan.code)}
                className={cn(
                  "w-full text-left rounded-xl border p-4 transition-all",
                  isSelected
                    ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                    : "border-border/50 bg-card/50 hover:border-primary/30",
                  plan.recommended && "relative"
                )}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {plan.recommended && (
                  <span className="absolute -top-2.5 left-4 px-2 py-0.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center gap-1">
                    <Star className="w-3 h-3" /> RECOMMANDÉ
                  </span>
                )}

                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-foreground">{price}$</span>
                    <span className="text-xs text-muted-foreground">/mois</span>
                  </div>
                </div>

                <p className="text-xs text-primary font-medium mb-2">
                  {plan.appointments} rendez-vous inclus/mois
                </p>

                {plan.socialProof && (
                  <p className="text-[10px] text-emerald-500 font-medium mb-2">{plan.socialProof}</p>
                )}

                <div className="space-y-1">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                      {feature}
                    </div>
                  ))}
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Desktop CTA */}
        <Button
          size="lg"
          className="w-full h-14 text-base font-semibold rounded-xl hidden sm:flex"
          onClick={handleContinue}
        >
          Activer ce plan
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
      </div>

      <StickyMobileCTA
        label="Activer ce plan"
        onClick={handleContinue}
        icon={<ArrowRight className="w-5 h-5 mr-2" />}
      />
    </FunnelLayout>
  );
}
