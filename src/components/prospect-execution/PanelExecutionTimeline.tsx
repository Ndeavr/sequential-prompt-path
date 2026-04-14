import { CheckCircle2, Circle, Loader2, XCircle, SkipForward } from "lucide-react";

export interface ExecutionStep {
  id: string;
  step_key: string;
  step_label: string;
  step_order: number;
  status: string;
  started_at?: string | null;
  completed_at?: string | null;
  error_message?: string | null;
  retry_count?: number;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  queued: <Circle className="h-4 w-4 text-muted-foreground" />,
  running: <Loader2 className="h-4 w-4 text-primary animate-spin" />,
  completed: <CheckCircle2 className="h-4 w-4 text-success" />,
  failed: <XCircle className="h-4 w-4 text-destructive" />,
  skipped: <SkipForward className="h-4 w-4 text-muted-foreground" />,
};

export default function PanelExecutionTimeline({ steps }: { steps: ExecutionStep[] }) {
  const sorted = [...steps].sort((a, b) => a.step_order - b.step_order);

  return (
    <div className="space-y-1">
      {sorted.map((step, i) => (
        <div key={step.id} className="flex items-start gap-3">
          <div className="flex flex-col items-center">
            {ICON_MAP[step.status] ?? ICON_MAP.queued}
            {i < sorted.length - 1 && (
              <div className="w-px h-6 bg-border" />
            )}
          </div>
          <div className="flex-1 min-w-0 pb-4">
            <p className="text-sm font-medium">{step.step_label}</p>
            {step.error_message && (
              <p className="text-xs text-destructive mt-0.5 truncate">{step.error_message}</p>
            )}
            {step.completed_at && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {new Date(step.completed_at).toLocaleTimeString("fr-CA")}
              </p>
            )}
            {(step.retry_count ?? 0) > 0 && (
              <p className="text-xs text-warning mt-0.5">{step.retry_count} retry(s)</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
