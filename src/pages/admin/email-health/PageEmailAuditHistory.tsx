/**
 * UNPRO — Email Audit History page
 */
import { useAuditRunHistory } from "@/hooks/useEmailAuditCenter";
import { CheckCircle2, AlertTriangle, Ban, XCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const STATUS_BADGE: Record<string, { icon: any; color: string; label: string }> = {
  completed: { icon: CheckCircle2, color: "text-emerald-500", label: "OK" },
  completed_with_warnings: { icon: AlertTriangle, color: "text-amber-500", label: "Avertissements" },
  blocked: { icon: Ban, color: "text-red-700", label: "Bloqué" },
  failed: { icon: XCircle, color: "text-destructive", label: "Échoué" },
};

const PageEmailAuditHistory = () => {
  const { data: runs } = useAuditRunHistory();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <Link to="/admin/email-health">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <h1 className="text-xl font-bold text-foreground">Historique des audits</h1>
        </div>

        {!runs?.length ? (
          <p className="text-sm text-muted-foreground text-center py-8">Aucun audit exécuté</p>
        ) : (
          <div className="space-y-2">
            {runs.map((run) => {
              const badge = STATUS_BADGE[run.status] || STATUS_BADGE.failed;
              const Icon = badge.icon;
              return (
                <div key={run.id} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border/20 bg-card">
                  <Icon className={`h-4 w-4 ${badge.color}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">Score: {run.score_percent}%</span>
                      <span className={`text-[10px] ${badge.color}`}>{badge.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {run.passed_count} passé · {run.warning_count} avertis. · {run.failed_count} échoué · {run.blocking_count} bloquant
                    </p>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {new Date(run.created_at).toLocaleString("fr-CA")}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default PageEmailAuditHistory;
