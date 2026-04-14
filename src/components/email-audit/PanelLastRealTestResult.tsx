/**
 * UNPRO — Last real test email result panel
 */
import { Mail, CheckCircle2, XCircle, Clock } from "lucide-react";
import type { TestMessage } from "@/hooks/useEmailAuditCenter";

interface Props {
  test: TestMessage | null;
}

const STATUS_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
  sent: { icon: CheckCircle2, color: "text-emerald-500", label: "Envoyé" },
  accepted: { icon: CheckCircle2, color: "text-emerald-500", label: "Accepté par le provider" },
  delivered: { icon: CheckCircle2, color: "text-emerald-500", label: "Livré" },
  pending: { icon: Clock, color: "text-muted-foreground", label: "En attente" },
  failed: { icon: XCircle, color: "text-destructive", label: "Échoué" },
  bounced: { icon: XCircle, color: "text-destructive", label: "Rebondi" },
  rejected: { icon: XCircle, color: "text-destructive", label: "Rejeté" },
};

const PanelLastRealTestResult = ({ test }: Props) => {
  if (!test) {
    return (
      <div className="rounded-xl border border-border/30 bg-card p-4">
        <div className="flex items-center gap-2 mb-2">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Dernier test réel</h3>
        </div>
        <p className="text-sm text-muted-foreground">Aucun test d'envoi réel effectué</p>
      </div>
    );
  }

  const status = STATUS_CONFIG[test.delivery_status] || STATUS_CONFIG[test.send_status] || STATUS_CONFIG.pending;
  const Icon = status.icon;

  return (
    <div className="rounded-xl border border-border/30 bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Mail className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">Dernier test réel</h3>
      </div>
      <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50 border border-border/20">
        <Icon className={`h-5 w-5 ${status.color}`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">{status.label}</p>
          <p className="text-xs text-muted-foreground">→ {test.recipient_email}</p>
          {test.error_message && <p className="text-xs text-destructive mt-0.5">{test.error_message}</p>}
        </div>
        <span className="text-[10px] text-muted-foreground">{new Date(test.created_at).toLocaleString("fr-CA")}</span>
      </div>
    </div>
  );
};

export default PanelLastRealTestResult;
