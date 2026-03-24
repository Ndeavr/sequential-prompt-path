/**
 * Module 3 — Alex + Objectifs + Stratégie + Plan Recommandé
 * Full-page funnel: Objectives → Strategy → Revenue → Plan
 */
import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Sparkles, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ObjectiveSelectorGrid from "@/components/goals/ObjectiveSelectorGrid";
import CurrentSituationSummary from "@/components/goals/CurrentSituationSummary";
import StrategyRecommendationCard from "@/components/goals/StrategyRecommendationCard";
import RevenueGoalInputCard from "@/components/goals/RevenueGoalInputCard";
import PlanRecommendationHero from "@/components/goals/PlanRecommendationHero";

const STEPS = ["Objectifs", "Stratégie", "Plan"];

function recommendPlan(objective: string, monthlyRdv: number, aipp: number): string {
  if (objective === "dominate") return monthlyRdv > 15 ? "signature" : "elite";
  if (objective === "compete") return "elite";
  if (objective === "growth" || objective === "profit") return monthlyRdv > 10 ? "elite" : "premium";
  if (objective === "appointments") return monthlyRdv > 8 ? "premium" : "pro";
  if (objective === "visibility") return aipp < 40 ? "pro" : "premium";
  if (objective === "maintain") return "pro";
  return "pro";
}

export default function PageAlexGoalsStrategy() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Load prefill data
  const prefill = useMemo(() => {
    try {
      const raw = sessionStorage.getItem("unpro_goals_prefill");
      if (raw) return JSON.parse(raw);
    } catch {}
    return {};
  }, []);

  const aippScore = prefill?.aippScore ?? 35;
  const city = prefill?.city ?? "";
  const completionPercent = prefill?.completionPercent ?? 45;
  const marketPosition = prefill?.marketPosition ?? "behind";

  // Objectives
  const [primaryObjective, setPrimaryObjective] = useState("");
  const [secondaryObjectives, setSecondaryObjectives] = useState<string[]>([]);

  // Revenue
  const [revenueInputs, setRevenueInputs] = useState({
    targetRevenue: 0,
    avgJobValue: 0,
    marginPercent: 0,
    closeRate: 30,
  });

  const requiredJobs = revenueInputs.avgJobValue > 0
    ? Math.ceil(revenueInputs.targetRevenue / revenueInputs.avgJobValue) : 0;
  const closeRate = revenueInputs.closeRate > 0 ? revenueInputs.closeRate / 100 : 0.3;
  const monthlyAppointments = closeRate > 0 ? Math.ceil(requiredJobs / closeRate / 12) : 0;

  const recPlan = useMemo(() =>
    recommendPlan(primaryObjective, monthlyAppointments, aippScore),
    [primaryObjective, monthlyAppointments, aippScore]
  );

  const showRevenue = ["growth", "profit", "appointments"].includes(primaryObjective);

  const saveObjectives = async () => {
    // Save to sessionStorage for checkout
    sessionStorage.setItem("unpro_plan_selection", JSON.stringify({
      plan: recPlan,
      primaryObjective,
      secondaryObjectives,
    }));

    // Persist to DB (best-effort)
    try {
      const contractorId = prefill?.contractorId;
      if (contractorId) {
        await supabase.from("onboarding_objectives").insert({
          contractor_id: contractorId,
          primary_objective: primaryObjective,
          secondary_objectives_json: secondaryObjectives,
        });
        await supabase.from("plan_recommendations").insert({
          contractor_id: contractorId,
          recommended_plan_code: recPlan,
          reason_summary: `Objectif: ${primaryObjective}, RDV/mois: ${monthlyAppointments}`,
          reason_json: { primaryObjective, secondaryObjectives, monthlyAppointments, aippScore },
        });
      }
    } catch {}
  };

  const handleSelectPlan = async (plan: string) => {
    setSaving(true);
    await saveObjectives();
    setSaving(false);
    navigate(`/pricing?plan=${plan}`);
  };

  const canAdvance = step === 0 ? !!primaryObjective : true;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/30">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" className="shrink-0" onClick={() => {
            if (step > 0) setStep(step - 1);
            else navigate(-1);
          }}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <div className="flex gap-1.5">
              {STEPS.map((s, i) => (
                <div
                  key={s}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    i <= step ? "bg-primary" : "bg-muted"
                  }`}
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{STEPS[step]}</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6 pb-32">
        <AnimatePresence mode="wait">
          {/* Step 0: Objectives */}
          {step === 0 && (
            <motion.div key="objectives" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              {/* Alex intro */}
              <div className="rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/5 p-4 flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <MessageCircle className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Alex</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    J'ai analysé votre profil. Votre score AIPP est de <span className="font-bold text-foreground">{aippScore}/100</span>.
                    Quel est votre vrai objectif maintenant?
                  </p>
                </div>
              </div>

              <ObjectiveSelectorGrid
                primary={primaryObjective}
                secondary={secondaryObjectives}
                onPrimaryChange={setPrimaryObjective}
                onSecondaryChange={setSecondaryObjectives}
              />
            </motion.div>
          )}

          {/* Step 1: Strategy */}
          {step === 1 && (
            <motion.div key="strategy" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              <CurrentSituationSummary
                aippScore={aippScore}
                marketPosition={marketPosition}
                completionPercent={completionPercent}
                city={city}
                primaryObjective={primaryObjective}
              />
              <StrategyRecommendationCard
                primaryObjective={primaryObjective}
                aippScore={aippScore}
              />
              {showRevenue && (
                <RevenueGoalInputCard
                  inputs={revenueInputs}
                  onChange={setRevenueInputs}
                />
              )}
            </motion.div>
          )}

          {/* Step 2: Plan recommendation */}
          {step === 2 && (
            <motion.div key="plan" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <PlanRecommendationHero
                recommendedPlan={recPlan}
                primaryObjective={primaryObjective}
                monthlyAppointments={monthlyAppointments}
                onSelectPlan={handleSelectPlan}
                onTalkToAlex={() => navigate("/alex/voice/realtime")}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Sticky bottom nav (steps 0-1) */}
      {step < 2 && (
        <div className="fixed bottom-0 inset-x-0 z-30 bg-background/90 backdrop-blur-xl border-t border-border/30 p-4">
          <div className="max-w-lg mx-auto">
            <Button
              size="lg"
              className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground"
              disabled={!canAdvance}
              onClick={() => setStep(step + 1)}
            >
              Suivant <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
