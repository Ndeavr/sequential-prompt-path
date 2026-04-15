import { Loader2, Mail, CheckCircle, XCircle, Clock, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useEmailDeliveryLogs } from "@/hooks/useEmailProductionControl";

const STATUS_CONFIG: Record<string, { color: string; icon: typeof CheckCircle }> = {
  sent: { color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30", icon: Send },
  delivered: { color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30", icon: CheckCircle },
  bounced: { color: "bg-destructive/10 text-destructive border-destructive/30", icon: XCircle },
  failed: { color: "bg-destructive/10 text-destructive border-destructive/30", icon: XCircle },
  queued: { color: "bg-amber-500/10 text-amber-600 border-amber-500/30", icon: Clock },
};

const PageAdminEmailLogs = () => {
  const { data: logs, isLoading } = useEmailDeliveryLogs(100);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">Email Delivery Logs</h1>
          <p className="text-sm text-muted-foreground">{logs?.length || 0} événements récents</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : logs && logs.length > 0 ? (
          <div className="space-y-2">
            {logs.map((log: any) => {
              const config = STATUS_CONFIG[log.status] || STATUS_CONFIG.queued;
              const Icon = config.icon;
              return (
                <div key={log.id} className="rounded-xl border border-border/30 bg-card p-3 flex items-center gap-3">
                  <Icon className={`h-4 w-4 shrink-0 ${config.color.includes("emerald") ? "text-emerald-500" : config.color.includes("destructive") ? "text-destructive" : "text-amber-500"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground truncate">{log.recipient_email || "—"}</span>
                      {log.template_name && <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{log.template_name}</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-muted-foreground">{log.domain_used || "—"}</span>
                      <span className="text-[11px] text-muted-foreground">•</span>
                      <span className="text-[11px] text-muted-foreground">{new Date(log.created_at).toLocaleString("fr-CA")}</span>
                    </div>
                  </div>
                  <Badge variant="outline" className={`text-[10px] ${config.color}`}>{log.status}</Badge>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 space-y-2">
            <Mail className="h-8 w-8 text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground">Aucun log de livraison</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PageAdminEmailLogs;
