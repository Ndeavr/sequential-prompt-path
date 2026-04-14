/**
 * UNPRO — Audit checks table with correct status/severity icons
 */
import { CheckCircle2, AlertTriangle, XCircle, Ban, Clock, MinusCircle } from "lucide-react";
import type { AuditCheck } from "@/hooks/useEmailAuditCenter";

interface Props {
  checks: AuditCheck[];
}

const STATUS_ICON: Record<string, { icon: any; color: string }> = {
  passed: { icon: CheckCircle2, color: "text-emerald-500" },
  warning: { icon: AlertTriangle, color: "text-amber-500" },
  failed: { icon: XCircle, color: "text-destructive" },
  blocking: { icon: Ban, color: "text-red-700" },
  pending: { icon: Clock, color: "text-muted-foreground" },
  running: { icon: Clock, color: "text-blue-500" },
  skipped: { icon: MinusCircle, color: "text-muted-foreground" },
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: "bg-red-500/10 text-red-500 border-red-500/20",
  high: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  medium: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  low: "bg-muted text-muted-foreground border-border/30",
};

const TableAuditChecksExecution = ({ checks }: Props) => {
  if (!checks.length) {
    return <p className="text-sm text-muted-foreground py-4 text-center">Aucune vérification exécutée</p>;
  }

  return (
    <div className="space-y-2">
      {checks.map((c) => {
        const si = STATUS_ICON[c.execution_status] || STATUS_ICON.pending;
        const Icon = si.icon;
        const sevClass = SEVERITY_COLORS[c.severity_level] || SEVERITY_COLORS.low;

        return (
          <div key={c.id} className="flex items-start gap-3 px-3 py-2.5 rounded-lg border border-border/20 bg-background/50">
            <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${si.color}`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-foreground">{c.check_label}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded border ${sevClass}`}>{c.severity_level}</span>
                {c.blocking_boolean && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">BLOQUANT</span>
                )}
              </div>
              {c.message && <p className="text-xs text-muted-foreground mt-0.5">{c.message}</p>}
              {c.recommendation && (
                <p className="text-xs text-amber-400 mt-0.5">→ {c.recommendation}</p>
              )}
            </div>
            <span className="text-[10px] text-muted-foreground shrink-0">{c.category}</span>
          </div>
        );
      })}
    </div>
  );
};

export default TableAuditChecksExecution;
