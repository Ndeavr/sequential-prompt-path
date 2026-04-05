/**
 * UNPRO — PageContractorPlanRecommendation
 * Objectives, sliders, plan comparison, revenue projections.
 */
import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { ArrowRight, ArrowLeft, Target, TrendingUp, CheckCircle2, Star, Zap, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import FunnelLayout from "@/components/contractor-funnel/FunnelLayout";
import CardGlass from "@/components/unpro/CardGlass";
import { useContractorFunnel } from "@/hooks/useContractorFunnel";
import { fadeUp, staggerContainer } from "@/lib/motion";
import type { PlanFit } from "@/types/contractorFunnel";

const GOALS = [
  { key: "appointments", label: "Plus de rendez-vous", icon: Target },
  { key: "google", label: "Visibilité Google", icon: TrendingUp },
  { key: "ai", label: "Visibilité IA", icon: Zap },
  { key: "schedule", label: "Remplir les périodes creuses", icon: Target },
  { key: "exclusivity", label: "Exclusivité territoriale", icon: Star },
  { key: "premium", label: "Projets premium", icon: Crown },
];

const MOCK_PLANS: PlanFit[] = [
  {
    planId: "pro", planName: "Pro", fitScore: 72, isRecommended: false,
    reasoning: "Bon début pour tester la plateforme.",
    projectedAppointmentsMonthly: 4, projectedVisibilityGain: 35,
    projectedRevenueRange: { min: 8000, max: 16000 }, monthlyPrice: 149,
  },
  {
    planId: "premium", planName: "Premium", fitScore: 91, isRecommended: true,
    reasoning: "Meilleur rapport qualité-prix pour vos objectifs de croissance.",
    projectedAppointmentsMonthly: 8, projectedVisibilityGain: 65,
    projectedRevenueRange: { min: 16000, max: 32000 }, monthlyPrice: 299,
  },
  {
    planId: "elite", planName: "Élite", fitScore: 78, isRecommended: false,
    reasoning: "Idéal pour les entreprises établies avec capacité élevée.",
    projectedAppointmentsMonthly: 15, projectedVisibilityGain: 90,
    projectedRevenueRange: { min: 30000, max: 60000 }, monthlyPrice: 599,
  },
];

export default function PageContractorPlanRecommendation() {
  const { state, updateState, goToStep } = useContractorFunnel();
  const [activeGoals, setActiveGoals] = useState<Set<string>>(new Set(["appointments", "google"]));
  const [capacity, setCapacity] = useState([8]);
  const [revenue, setRevenue] = useState([20000]);
  const [selectedPlan, setSelectedPlan] = useState<string>("premium");

  const toggleGoal = (key: string) => {
    setActiveGoals((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleSelectPlan = (planId: string) => {
    setSelectedPlan(planId);
    updateState({ selectedPlanId: planId });
  };

  return (
    <>
      <Helmet>
        <title>Plan recommandé | UNPRO</title>
      </Helmet>

      <FunnelLayout currentStep="plan_recommendation" width="wide">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* ─── Left: Objectives ─── */}
          <div className="lg:col-span-2 space-y-6">
            <motion.div initial="hidden" animate="visible" variants={fadeUp}>
              <h2 className="text-xl font-bold font-display text-foreground mb-1">
                Vos objectifs
              </h2>
              <p className="text-sm text-muted-foreground">
                On recommande le meilleur plan selon vos besoins
              </p>
            </motion.div>

            {/* Goal toggles */}
            <CardGlass noAnimation>
              <h3 className="text-sm font-semibold text-foreground mb-4">Objectifs prioritaires</h3>
              <div className="space-y-3">
                {GOALS.map((goal) => (
                  <button
                    key={goal.key}
                    onClick={() => toggleGoal(goal.key)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                      activeGoals.has(goal.key)
                        ? "bg-primary/10 border border-primary/20"
                        : "bg-muted/30 border border-transparent hover:bg-muted/50"
                    }`}
                  >
                    <goal.icon className={`h-4 w-4 ${activeGoals.has(goal.key) ? "text-primary" : "text-muted-foreground"}`} />
                    <span className={`text-sm ${activeGoals.has(goal.key) ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                      {goal.label}
                    </span>
                  </button>
                ))}
              </div>
            </CardGlass>

            {/* Sliders */}
            <CardGlass noAnimation>
              <h3 className="text-sm font-semibold text-foreground mb-4">Capacité & Objectifs</h3>
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-xs text-muted-foreground">Projets / semaine</span>
                    <span className="text-xs font-medium text-foreground">{capacity[0]}</span>
                  </div>
                  <Slider value={capacity} onValueChange={setCapacity} min={1} max={30} step={1} />
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-xs text-muted-foreground">Revenus mensuels visés</span>
                    <span className="text-xs font-medium text-foreground">
                      {revenue[0].toLocaleString("fr-CA")} $
                    </span>
                  </div>
                  <Slider value={revenue} onValueChange={setRevenue} min={5000} max={100000} step={1000} />
                </div>
              </div>
            </CardGlass>
          </div>

          {/* ─── Right: Plans ─── */}
          <div className="lg:col-span-3 space-y-4">
            <motion.div initial="hidden" animate="visible" variants={fadeUp}>
              <h2 className="text-xl font-bold font-display text-foreground mb-4">
                Plans recommandés
              </h2>
            </motion.div>

            <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="space-y-4">
              {MOCK_PLANS.map((plan) => (
                <motion.div key={plan.planId} variants={fadeUp}>
                  <CardGlass
                    noAnimation
                    elevated={plan.isRecommended}
                    className={`relative cursor-pointer transition-all ${
                      selectedPlan === plan.planId ? "ring-2 ring-primary/50" : ""
                    }`}
                    onClick={() => handleSelectPlan(plan.planId)}
                  >
                    {plan.isRecommended && (
                      <div className="absolute -top-3 left-4 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                        Recommandé
                      </div>
                    )}

                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-bold font-display text-foreground">{plan.planName}</h3>
                        <p className="text-xs text-muted-foreground">{plan.reasoning}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold font-display text-foreground">{plan.monthlyPrice}$</p>
                        <p className="text-xs text-muted-foreground">/mois</p>
                      </div>
                    </div>

                    {/* Metrics */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center p-2 rounded-xl bg-muted/30">
                        <p className="text-lg font-bold text-foreground">{plan.projectedAppointmentsMonthly}</p>
                        <p className="text-xs text-muted-foreground">RDV/mois</p>
                      </div>
                      <div className="text-center p-2 rounded-xl bg-muted/30">
                        <p className="text-lg font-bold text-foreground">+{plan.projectedVisibilityGain}%</p>
                        <p className="text-xs text-muted-foreground">Visibilité</p>
                      </div>
                      <div className="text-center p-2 rounded-xl bg-muted/30">
                        <p className="text-lg font-bold text-foreground">{plan.fitScore}%</p>
                        <p className="text-xs text-muted-foreground">Fit score</p>
                      </div>
                    </div>

                    {/* Revenue projection */}
                    <div className="mt-3 p-3 rounded-xl bg-success/5 border border-success/10">
                      <p className="text-xs text-success font-medium">
                        Revenus potentiels : {plan.projectedRevenueRange.min.toLocaleString("fr-CA")}$ — {plan.projectedRevenueRange.max.toLocaleString("fr-CA")}$/mois
                      </p>
                    </div>
                  </CardGlass>
                </motion.div>
              ))}
            </motion.div>

            {/* CTA */}
            <motion.div initial="hidden" animate="visible" variants={fadeUp} className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button variant="ghost" onClick={() => goToStep("faq_builder")} className="text-sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour
              </Button>
              <Button
                className="flex-1 h-13 rounded-xl text-sm font-semibold bg-gradient-to-r from-primary to-secondary hover:opacity-90 shadow-[var(--shadow-glow)]"
                onClick={() => goToStep("checkout")}
                disabled={!selectedPlan}
              >
                Continuer vers le paiement
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </motion.div>
          </div>
        </div>
      </FunnelLayout>
    </>
  );
}
