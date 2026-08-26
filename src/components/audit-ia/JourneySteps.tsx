/**
 * UNPRO — Contractor journey, 6 numbered steps.
 * Explicit left-to-right path: free AI audit → activation → recommended by AI.
 * States: completed (green check) / current (gold) / pending (gray).
 */
import { Check } from "lucide-react";

export const JOURNEY_STEPS = [
  { n: 1, label: "Audit IA gratuit", hint: "30 secondes · gratuit" },
  { n: 2, label: "Votre résultat", hint: "Ce qui limite vos recommandations" },
  { n: 3, label: "Votre profil", hint: "Vérifiez et complétez" },
  { n: 4, label: "Améliorez votre présence", hint: "Ce qui mérite votre attention" },
  { n: 5, label: "Devenez recommandable", hint: "Demandes compatibles" },
  { n: 6, label: "Rendez-vous exclusifs", hint: "Jamais de leads partagés" },
] as const;


type StepState = "completed" | "current" | "pending";

function stateOf(stepN: number, currentStep: number): StepState {
  if (stepN < currentStep) return "completed";
  if (stepN === currentStep) return "current";
  return "pending";
}

export function JourneySteps({ currentStep }: { currentStep: number }) {
  return (
    <ol
      className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-2.5 px-4 sm:grid-cols-3 sm:px-6 lg:grid-cols-6"
      aria-label="Parcours entrepreneur"
    >
      {JOURNEY_STEPS.map((s) => {
        const state = stateOf(s.n, currentStep);
        return (
          <li
            key={s.n}
            aria-current={state === "current" ? "step" : undefined}
            className={`rounded-2xl border p-3 transition-colors ${
              state === "current"
                ? "border-primary/50 bg-secondary shadow-sm"
                : state === "completed"
                  ? "border-success/30 bg-[hsl(152_69%_31%/0.05)]"
                  : "border-border bg-card"
            }`}
          >
            <div className="flex items-center gap-2">
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-bold tabular-nums ${
                  state === "current"
                    ? "gold-btn"
                    : state === "completed"
                      ? "bg-success text-success-foreground"
                      : "border border-border bg-muted text-muted-foreground"
                }`}
                aria-hidden
              >
                {state === "completed" ? <Check className="h-3.5 w-3.5" /> : s.n}
              </span>
              <span className="sr-only">
                {state === "completed" ? "Terminé : " : state === "current" ? "Étape en cours : " : "À venir : "}
              </span>
              <p
                className={`text-[12px] font-semibold leading-tight ${
                  state === "pending" ? "text-muted-foreground" : "text-foreground"
                }`}
              >
                {s.label}
              </p>
            </div>
            <p className="mt-1.5 pl-8 text-[10.5px] uppercase tracking-wide text-muted-foreground">{s.hint}</p>
          </li>
        );
      })}
    </ol>
  );
}
