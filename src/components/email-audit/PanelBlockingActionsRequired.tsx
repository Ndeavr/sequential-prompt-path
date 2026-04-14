/**
 * UNPRO — Panel showing blocking issues with actionable fix descriptions
 */
import { Ban, ArrowRight } from "lucide-react";
import type { AuditCheck, ActionRecommendation } from "@/hooks/useEmailAuditCenter";

interface Props {
  checks: AuditCheck[];
  recommendations: ActionRecommendation[];
}

const PanelBlockingActionsRequired = ({ checks, recommendations }: Props) => {
  const blocking = checks.filter(c => c.blocking_boolean || c.execution_status === "blocking" || c.execution_status === "failed");
  if (!blocking.length) return null;

  const recMap = new Map(recommendations.map(r => [r.check_code, r]));

  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Ban className="h-4 w-4 text-destructive" />
        <h3 className="text-sm font-semibold text-destructive">
          {blocking.length} action{blocking.length > 1 ? "s" : ""} requise{blocking.length > 1 ? "s" : ""}
        </h3>
      </div>
      <div className="space-y-2">
        {blocking.map(c => {
          const rec = recMap.get(c.check_code);
          return (
            <div key={c.id} className="flex items-start gap-3 p-3 rounded-lg bg-background/60 border border-border/20">
              <ArrowRight className="h-3.5 w-3.5 mt-0.5 text-destructive shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{rec?.action_title || c.check_label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{rec?.action_description || c.recommendation || c.message}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PanelBlockingActionsRequired;
