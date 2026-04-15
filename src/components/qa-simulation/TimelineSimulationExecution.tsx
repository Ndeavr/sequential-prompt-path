import CardSimulationStepStatus from "./CardSimulationStepStatus";
import type { SimulationStep } from "@/hooks/useQASimulation";

interface Props {
  steps: SimulationStep[];
  onRetryStep?: (stepId: string) => void;
}

export default function TimelineSimulationExecution({ steps, onRetryStep }: Props) {
  if (steps.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-6">Aucune étape</p>;
  }

  return (
    <div className="relative space-y-2 pl-4">
      {/* Vertical line */}
      <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border/60" />
      {steps.map((step, i) => (
        <div key={step.id} className="relative">
          {/* Dot */}
          <div className={`absolute -left-4 top-3.5 w-2 h-2 rounded-full ${
            step.status === "passed" ? "bg-emerald-400" :
            step.status === "failed" ? "bg-red-400" :
            step.status === "running" ? "bg-primary animate-pulse" :
            "bg-muted-foreground/40"
          }`} />
          <CardSimulationStepStatus step={step} onRetry={onRetryStep} />
        </div>
      ))}
    </div>
  );
}
