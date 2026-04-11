import { CheckCircle2, Circle, Loader2 } from "lucide-react";

type StepStatus = "completed" | "active" | "pending";

interface Step {
  label: string;
  status: StepStatus;
}

interface Props {
  steps?: Step[];
  currentStep?: number;
}

const DEFAULT_STEPS: Step[] = [
  { label: "Importer", status: "completed" },
  { label: "Analyser", status: "active" },
  { label: "Résultats", status: "pending" },
];

export default function StepperAnalyseTroisSoumissions({ steps = DEFAULT_STEPS }: Props) {
  return (
    <div className="flex items-center justify-center gap-2">
      {steps.map((step, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            {step.status === "completed" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            ) : step.status === "active" ? (
              <Loader2 className="h-4 w-4 text-primary animate-spin" />
            ) : (
              <Circle className="h-4 w-4 text-muted-foreground/40" />
            )}
            <span className={`text-xs font-medium ${
              step.status === "completed" ? "text-emerald-500" :
              step.status === "active" ? "text-primary" :
              "text-muted-foreground/60"
            }`}>
              {step.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={`w-8 h-px ${step.status === "completed" ? "bg-emerald-500/40" : "bg-border/40"}`} />
          )}
        </div>
      ))}
    </div>
  );
}
