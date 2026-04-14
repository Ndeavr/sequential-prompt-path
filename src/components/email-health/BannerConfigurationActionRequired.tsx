/**
 * UNPRO — Configuration Action Required Banner
 */
import { AlertTriangle } from "lucide-react";
import type { EmailAlert } from "@/hooks/useEmailHealthCenter";

interface Props {
  alerts: EmailAlert[];
}

const SEVERITY_STYLE: Record<string, string> = {
  critical: "bg-destructive/10 border-destructive/20 text-destructive",
  high: "bg-orange-500/10 border-orange-500/20 text-orange-600",
  medium: "bg-amber-500/10 border-amber-500/20 text-amber-600",
  low: "bg-muted/30 border-border/20 text-muted-foreground",
};

const BannerConfigurationActionRequired = ({ alerts }: Props) => {
  if (!alerts.length) return null;

  return (
    <div className="space-y-2">
      {alerts.map((a) => (
        <div key={a.id} className={`flex gap-3 px-4 py-3 rounded-xl border ${SEVERITY_STYLE[a.severity] || SEVERITY_STYLE.medium}`}>
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{a.title}</p>
            <p className="text-xs mt-0.5 opacity-80">{a.message}</p>
            {a.recommended_action && (
              <p className="text-xs mt-1 font-medium">→ {a.recommended_action}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default BannerConfigurationActionRequired;
