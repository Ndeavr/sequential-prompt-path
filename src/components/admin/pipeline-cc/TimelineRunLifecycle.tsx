import { CheckCircle2, Circle, XCircle, AlertTriangle, RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PipelineRunTransition } from "@/services/pipelineCommandCenterService";

const ICON: Record<string, JSX.Element> = {
  success: <CheckCircle2 className="h-4 w-4 text-emerald-400" />,
  failed: <XCircle className="h-4 w-4 text-red-400" />,
  blocked: <AlertTriangle className="h-4 w-4 text-amber-400" />,
  manual_retry: <RotateCw className="h-4 w-4 text-primary" />,
};

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export default function TimelineRunLifecycle({ transitions }: { transitions: PipelineRunTransition[] }) {
  if (!transitions?.length) {
    return <p className="text-xs text-muted-foreground text-center py-6">Aucune transition enregistrée</p>;
  }
  return (
    <div className="space-y-0">
      {transitions.map((t, i) => (
        <div key={t.id} className="flex items-start gap-3">
          <div className="flex flex-col items-center">
            {ICON[t.transition_status ?? ""] ?? <Circle className="h-4 w-4 text-muted-foreground" />}
            {i < transitions.length - 1 && <div className="w-px h-8 bg-border" />}
          </div>
          <div className="flex-1 min-w-0 pb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium">
                {t.from_stage ?? "—"} <span className="text-muted-foreground">→</span> {t.to_stage ?? "—"}
              </span>
              <span className={cn(
                "text-[10px] px-1.5 py-0.5 rounded border",
                t.transition_status === "success" && "border-emerald-500/30 text-emerald-300",
                t.transition_status === "failed" && "border-red-500/30 text-red-300",
                t.transition_status === "blocked" && "border-amber-500/30 text-amber-300",
                t.transition_status === "manual_retry" && "border-primary/40 text-primary",
              )}>
                {t.transition_status ?? "n/a"}
              </span>
            </div>
            {t.message && <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{t.message}</p>}
            <p className="text-[10px] text-muted-foreground mt-0.5">{fmtTime(t.created_at)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
