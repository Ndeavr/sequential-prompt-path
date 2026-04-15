import { CheckCircle2, XCircle, Clock, Loader2, SkipForward, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SimulationStep } from "@/hooks/useQASimulation";

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  pending: { icon: <Clock className="w-4 h-4" />, color: "text-muted-foreground", label: "En attente" },
  running: { icon: <Loader2 className="w-4 h-4 animate-spin" />, color: "text-primary", label: "En cours" },
  passed: { icon: <CheckCircle2 className="w-4 h-4" />, color: "text-emerald-400", label: "Réussi" },
  failed: { icon: <XCircle className="w-4 h-4" />, color: "text-red-400", label: "Échoué" },
  skipped: { icon: <SkipForward className="w-4 h-4" />, color: "text-muted-foreground", label: "Ignoré" },
};

interface Props {
  step: SimulationStep;
  onRetry?: (stepId: string) => void;
}

export default function CardSimulationStepStatus({ step, onRetry }: Props) {
  const cfg = STATUS_CONFIG[step.status] || STATUS_CONFIG.pending;

  return (
    <div className="glass-card rounded-lg p-3 border border-border/50">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className={cfg.color}>{cfg.icon}</span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{step.step_label}</p>
            {step.actual_result && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">{step.actual_result}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {step.duration_ms != null && (
            <span className="text-xs text-muted-foreground">{step.duration_ms}ms</span>
          )}
          {step.retry_count > 0 && (
            <span className="text-xs text-muted-foreground">×{step.retry_count}</span>
          )}
          {step.status === "failed" && onRetry && (
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => onRetry(step.id)}>
              <RotateCcw className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
