/**
 * PanelPlanFitCheck — Alex pose 3-4 questions pour valider que le plan choisi
 * convient au contractor. Affiche ensuite un verdict + recommandation.
 */
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Check, ArrowRight, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  recommendPlan,
  getPlanLabel,
  getRecommendationReasons,
} from "@/services/planRecommendationService";
import type { PlanGoal, RecommendedPlan } from "@/types/outreachFunnel";
import { trackFunnelEvent } from "@/utils/trackFunnelEvent";

interface Props {
  selectedPlanCode: string; // ex: "pro"
  onConfirm: (finalPlanCode: RecommendedPlan) => void;
}

type AnswerKey = "appts" | "value" | "areas" | "goal";

interface QStep {
  key: AnswerKey;
  question: string;
  options: { label: string; value: number | PlanGoal }[];
}

const STEPS: QStep[] = [
  {
    key: "appts",
    question: "Combien de rendez-vous par mois visez-vous ?",
    options: [
      { label: "Moins de 5", value: 3 },
      { label: "5 à 15", value: 10 },
      { label: "15 à 30", value: 22 },
      { label: "30 et plus", value: 40 },
    ],
  },
  {
    key: "value",
    question: "Valeur moyenne d'un contrat ?",
    options: [
      { label: "Moins de 2 000 $", value: 1500 },
      { label: "2 000 – 5 000 $", value: 3500 },
      { label: "5 000 – 10 000 $", value: 7500 },
      { label: "Plus de 10 000 $", value: 15000 },
    ],
  },
  {
    key: "areas",
    question: "Combien de villes desservez-vous ?",
    options: [
      { label: "1 ville", value: 1 },
      { label: "2 ou 3", value: 3 },
      { label: "4 et plus", value: 5 },
    ],
  },
  {
    key: "goal",
    question: "Votre objectif principal ?",
    options: [
      { label: "Présence IA", value: "ai_presence" },
      { label: "Plus de RDV", value: "appointments" },
      { label: "Mieux convertir", value: "conversion" },
      { label: "Dominer mon territoire", value: "territory" },
    ],
  },
];

export default function PanelPlanFitCheck({ selectedPlanCode, onConfirm }: Props) {
  const [stepIdx, setStepIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [done, setDone] = useState(false);

  const recommended = useMemo<RecommendedPlan | null>(() => {
    if (!done) return null;
    return recommendPlan({
      aippScore: null,
      confidenceLevel: "medium",
      goal: (answers.goal as PlanGoal) ?? "ai_presence",
      monthlyAppointmentGoal: answers.appts,
      averageJobValue: answers.value,
      serviceAreaCount: answers.areas,
    });
  }, [done, answers]);

  const handleAnswer = (val: any) => {
    const step = STEPS[stepIdx];
    const next = { ...answers, [step.key]: val };
    setAnswers(next);
    trackFunnelEvent("plan_selected", { fit_check_step: step.key, value: String(val) }).catch(() => {});

    if (stepIdx + 1 >= STEPS.length) {
      setDone(true);
    } else {
      setStepIdx(stepIdx + 1);
    }
  };

  if (done && recommended) {
    const sameAsChoice = recommended === (selectedPlanCode as RecommendedPlan);
    const reasons = getRecommendationReasons(recommended, null);
    const recoLabel = getPlanLabel(recommended);
    const choiceLabel = getPlanLabel(selectedPlanCode as RecommendedPlan);

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 to-accent/5 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <p className="text-xs uppercase tracking-wider font-bold text-primary">
              {sameAsChoice ? "Choix confirmé par Alex" : "Recommandation d'Alex"}
            </p>
          </div>

          <h3 className="font-display text-xl font-bold text-foreground">
            {sameAsChoice
              ? `${choiceLabel} est le bon plan pour vous.`
              : `${recoLabel} serait plus rentable que ${choiceLabel}.`}
          </h3>

          <ul className="space-y-2">
            {reasons.map((r, i) => (
              <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-2">
          {!sameAsChoice && (
            <Button
              size="lg"
              className="w-full h-12 gap-2"
              onClick={() => {
                trackFunnelEvent("plan_selected", { fit_check: "switched", from: selectedPlanCode, to: recommended }).catch(() => {});
                onConfirm(recommended);
              }}
            >
              <TrendingUp className="w-4 h-4" />
              Passer à {recoLabel}
            </Button>
          )}
          <Button
            size="lg"
            variant={sameAsChoice ? "default" : "outline"}
            className="w-full h-12 gap-2"
            onClick={() => {
              trackFunnelEvent("plan_selected", { fit_check: "kept", plan: selectedPlanCode }).catch(() => {});
              onConfirm(selectedPlanCode as RecommendedPlan);
            }}
          >
            {sameAsChoice ? "Continuer avec " + choiceLabel : "Garder " + choiceLabel}
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </motion.div>
    );
  }

  const step = STEPS[stepIdx];
  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="flex items-center gap-1.5">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i <= stepIdx ? "bg-primary" : "bg-muted"
            }`}
          />
        ))}
      </div>

      {/* Alex bubble */}
      <div className="flex gap-2.5">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <Sparkles className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 bg-muted rounded-2xl rounded-bl-md px-4 py-3">
          {stepIdx === 0 && (
            <p className="text-xs text-muted-foreground mb-1">
              Avant de confirmer <strong className="text-foreground">{getPlanLabel(selectedPlanCode as RecommendedPlan)}</strong>, 4 questions rapides :
            </p>
          )}
          <p className="text-sm font-medium text-foreground">{step.question}</p>
        </div>
      </div>

      {/* Options */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step.key}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="grid grid-cols-1 gap-2"
        >
          {step.options.map((opt) => (
            <button
              key={String(opt.value)}
              onClick={() => handleAnswer(opt.value)}
              className="h-12 rounded-xl border border-border/60 bg-card/60 hover:border-primary/50 hover:bg-primary/5 transition-all text-sm font-medium text-foreground text-left px-4 active:scale-[0.98]"
            >
              {opt.label}
            </button>
          ))}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
