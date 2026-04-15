import { CheckCircle2, XCircle, AlertTriangle, Clock, Ban } from "lucide-react";
import type { VerificationStatus } from "./CardVerificationStatus";

interface TimelineStep {
  key: string;
  label: string;
  status: VerificationStatus;
  durationMs?: number;
  detail?: string;
}

const iconMap: Record<VerificationStatus, { icon: typeof CheckCircle2; color: string }> = {
  passed: { icon: CheckCircle2, color: "text-green-500" },
  partial: { icon: AlertTriangle, color: "text-orange-500" },
  failed: { icon: XCircle, color: "text-red-500" },
  blocked: { icon: Ban, color: "text-red-600" },
  not_tested: { icon: Clock, color: "text-muted-foreground" },
  running: { icon: Clock, color: "text-blue-500 animate-pulse" },
};

export default function TimelineCriticalPathExecution({ steps }: { steps: TimelineStep[] }) {
  return (
    <div className="space-y-0">
      {steps.map((step, i) => {
        const { icon: Icon, color } = iconMap[step.status];
        const isLast = i === steps.length - 1;
        return (
          <div key={step.key} className="flex gap-3">
            <div className="flex flex-col items-center">
              <Icon className={`h-4 w-4 ${color} flex-shrink-0`} />
              {!isLast && <div className="w-px flex-1 bg-border min-h-[20px]" />}
            </div>
            <div className="pb-3 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium">{step.label}</span>
                {step.durationMs != null && <span className="text-[10px] text-muted-foreground font-mono">{step.durationMs}ms</span>}
              </div>
              {step.detail && <p className="text-[10px] text-muted-foreground mt-0.5">{step.detail}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
