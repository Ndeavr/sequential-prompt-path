/**
 * UNPRO — Homeowner Intent Form (onboarding step 3)
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";

const INTENTS = [
  { value: "ameliorer", label: "Améliorer / Rénover" },
  { value: "entretenir", label: "Entretenir" },
  { value: "reparer", label: "Réparer un problème" },
  { value: "acheter_vendre", label: "Acheter / Vendre" },
  { value: "gerer", label: "Gérer ma propriété" },
];

const TIMELINES = [
  { value: "urgent", label: "Urgent (cette semaine)" },
  { value: "soon", label: "Bientôt (ce mois-ci)" },
  { value: "planning", label: "Je planifie" },
  { value: "exploring", label: "J'explore" },
];

const BUDGETS = [
  { value: "small", label: "Moins de 5 000 $" },
  { value: "medium", label: "5 000 $ – 25 000 $" },
  { value: "large", label: "25 000 $ – 100 000 $" },
  { value: "xlarge", label: "Plus de 100 000 $" },
  { value: "unknown", label: "Pas encore défini" },
];

interface FormHomeownerIntentProps {
  onSave: (data: { project_intent: string; timeline: string; budget_range: string }) => void;
  loading?: boolean;
}

export default function FormHomeownerIntent({ onSave, loading }: FormHomeownerIntentProps) {
  const [intent, setIntent] = useState("");
  const [timeline, setTimeline] = useState("");
  const [budget, setBudget] = useState("");

  const isValid = intent && timeline && budget;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-bold text-foreground">Votre besoin</h2>
        <p className="text-sm text-muted-foreground mt-1">Aidez-nous à mieux vous orienter</p>
      </div>

      <div className="space-y-4">
        <div>
          <p className="text-sm font-semibold text-foreground mb-2">Besoin actuel</p>
          <div className="grid gap-2">
            {INTENTS.map((i) => (
              <button
                key={i.value}
                onClick={() => setIntent(i.value)}
                className={`p-3 rounded-xl text-sm font-medium border transition-all text-left ${
                  intent === i.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-foreground hover:border-primary/30"
                }`}
              >
                {i.label}
              </button>
            ))}
          </div>
        </div>

        {intent && (
          <div>
            <p className="text-sm font-semibold text-foreground mb-2">Échéancier</p>
            <div className="grid grid-cols-2 gap-2">
              {TIMELINES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setTimeline(t.value)}
                  className={`p-3 rounded-xl text-xs font-medium border transition-all ${
                    timeline === t.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-foreground hover:border-primary/30"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {timeline && (
          <div>
            <p className="text-sm font-semibold text-foreground mb-2">Budget approximatif</p>
            <div className="grid gap-2">
              {BUDGETS.map((b) => (
                <button
                  key={b.value}
                  onClick={() => setBudget(b.value)}
                  className={`p-3 rounded-xl text-sm font-medium border transition-all text-left ${
                    budget === b.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-foreground hover:border-primary/30"
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {isValid && (
        <Button
          onClick={() => onSave({ project_intent: intent, timeline, budget_range: budget })}
          disabled={loading}
          className="w-full h-11 rounded-xl"
        >
          {loading ? "Enregistrement…" : "Continuer"}
        </Button>
      )}
    </div>
  );
}
