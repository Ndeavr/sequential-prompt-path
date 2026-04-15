import CardSimulationStepStatus from "./CardSimulationStepStatus";
import type { SimulationStep, SimulationEvent, StepCheck } from "@/hooks/useQASimulation";

interface Props {
  steps: SimulationStep[];
  events?: SimulationEvent[];
  onRetryStep?: (stepId: string) => void;
}

export default function TimelineSimulationExecution({ steps, events = [], onRetryStep }: Props) {
  if (steps.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-6">Aucune étape</p>;
  }

  // Build checks map from events
  const checksMap = new Map<string, StepCheck[]>();
  for (const ev of events) {
    if (ev.step_id && ev.event_payload_json?.checks) {
      checksMap.set(ev.step_id, ev.event_payload_json.checks as StepCheck[]);
    }
  }

  return (
    <div className="relative space-y-2 pl-4">
      <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border/60" />
      {steps.map((step) => (
        <div key={step.id} className="relative">
          <div className={`absolute -left-4 top-3.5 w-2 h-2 rounded-full ${
            step.status === "passed" ? "bg-emerald-400" :
            step.status === "failed" ? "bg-red-400" :
            step.status === "running" ? "bg-primary animate-pulse" :
            "bg-muted-foreground/40"
          }`} />
          <CardSimulationStepStatus
            step={step}
            checks={checksMap.get(step.id)}
            onRetry={onRetryStep}
          />
        </div>
      ))}
    </div>
  );
}
