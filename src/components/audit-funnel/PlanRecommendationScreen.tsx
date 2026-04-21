import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, CheckCircle2, Target } from "lucide-react";
import { getPlanLabel, getRecommendationReasons } from "@/services/planRecommendationService";
import type { PlanGoal, RecommendedPlan } from "@/types/outreachFunnel";

interface Props {
  score: number | null;
  confidence: "low" | "medium" | "high" | null;
  onGoalSet: (goal: PlanGoal, opts?: { monthlyAppointmentGoal?: number; averageJobValue?: number; serviceAreaCount?: number }) => void;
  recommendedPlan: RecommendedPlan | null;
  onSelectPlan: (plan: RecommendedPlan) => void;
  selectedPlan: RecommendedPlan | null;
  showCheckout: boolean;
  onCheckoutComplete: () => void;
}

const GOALS: { key: PlanGoal; label: string }[] = [
  { key: "visibility", label: "Plus de visibilité locale" },
  { key: "appointments", label: "Plus de rendez-vous" },
  { key: "conversion", label: "Mieux convertir" },
  { key: "ai_presence", label: "Structurer ma présence IA" },
  { key: "territory", label: "Dominer mon territoire" },
];

const ALL_PLANS: RecommendedPlan[] = ["recrue", "pro", "premium", "elite", "signature"];

export function PlanRecommendationScreen({
  score,
  confidence,
  onGoalSet,
  recommendedPlan,
  onSelectPlan,
  selectedPlan,
  showCheckout,
  onCheckoutComplete,
}: Props) {
  const [goalSelected, setGoalSelected] = useState(false);

  if (!goalSelected || !recommendedPlan) {
    return (
      <div className="max-w-lg mx-auto px-4 pt-16 pb-16">
        <h2 className="font-display text-2xl font-bold mb-2 text-center">Quel est votre objectif principal ?</h2>
        <p className="text-sm text-muted-foreground text-center mb-8">
          Basé sur votre score et vos signaux, nous allons recommander le plan le plus adapté.
        </p>
        <div className="space-y-3">
          {GOALS.map((g) => (
            <Button
              key={g.key}
              variant="outline"
              className="w-full justify-start gap-3 py-5 text-left"
              onClick={() => {
                onGoalSet(g.key);
                setGoalSelected(true);
              }}
            >
              <Target className="w-4 h-4 text-primary shrink-0" />
              {g.label}
            </Button>
          ))}
        </div>
      </div>
    );
  }

  // Show recommendation with plan context
  const recIdx = ALL_PLANS.indexOf(recommendedPlan);
  const visiblePlans = ALL_PLANS.filter((_, i) => Math.abs(i - recIdx) <= 1);
  const reasons = getRecommendationReasons(recommendedPlan, score);

  if (showCheckout) {
    return (
      <div className="max-w-lg mx-auto px-4 pt-16 pb-16 text-center">
        <h2 className="font-display text-2xl font-bold mb-4">Votre plan est prêt</h2>
        <p className="text-muted-foreground mb-2">
          Plan sélectionné : <strong className="text-primary">{getPlanLabel(selectedPlan || recommendedPlan)}</strong>
        </p>
        <p className="text-sm text-muted-foreground mb-8">
          Activez maintenant votre présence UNPRO.
        </p>
        <div className="rounded-2xl border border-border/30 bg-card/20 p-6 mb-6 text-left text-sm space-y-2">
          {["Activation rapide", "Profil optimisable ensuite", "Historique et score conservés", "Aucune donnée inventée"].map((t) => (
            <div key={t} className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-400" /> {t}
            </div>
          ))}
        </div>
        <Button size="lg" onClick={onCheckoutComplete} className="gap-2">
          Activer mon plan <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 pt-16 pb-16">
      <h2 className="font-display text-2xl font-bold mb-2 text-center">Plan recommandé pour votre situation</h2>
      <p className="text-sm text-muted-foreground text-center mb-8">
        Basé sur vos signaux actuels, votre objectif et votre potentiel de croissance.
      </p>

      {/* Recommendation reasons */}
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 mb-6">
        <div className="space-y-2">
          {reasons.map((r, i) => (
            <div key={i} className="flex items-start gap-2 text-sm">
              <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <span>{r}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Plan cards */}
      <div className="grid gap-4">
        {visiblePlans.map((plan) => {
          const isRec = plan === recommendedPlan;
          return (
            <div
              key={plan}
              className={`rounded-2xl border p-6 cursor-pointer transition-all ${
                isRec ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border/30 bg-card/10 hover:bg-card/20"
              }`}
              onClick={() => onSelectPlan(plan)}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-lg">{getPlanLabel(plan)}</h3>
                {isRec && <Badge className="bg-primary/20 text-primary border-0">Recommandé</Badge>}
              </div>
              <Button size="sm" variant={isRec ? "default" : "outline"} className="mt-2 gap-2">
                Choisir {getPlanLabel(plan)} <ArrowRight className="w-3 h-3" />
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
