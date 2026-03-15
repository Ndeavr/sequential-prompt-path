/**
 * UNPRO — Admin Alerts Center
 * Notification list with severity, actions, read/unread.
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import AdminLayout from "@/layouts/AdminLayout";
import { PageHeader, LoadingState, EmptyState } from "@/components/shared";
import { useAdminNotifications, useMarkNotificationRead } from "@/hooks/useAdminVerification";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, BellOff, Eye, CheckCircle2, AlertTriangle, ShieldAlert, XCircle } from "lucide-react";
import { toast } from "sonner";

const SEVERITY_CONFIG: Record<string, { icon: React.ElementType; className: string }> = {
  critical: { icon: XCircle, className: "border-destructive/30 bg-destructive/5" },
  high: { icon: ShieldAlert, className: "border-warning/30 bg-warning/5" },
  medium: { icon: AlertTriangle, className: "border-primary/20 bg-primary/5" },
  info: { icon: Bell, className: "border-border/40 bg-card/80" },
};

export default function AdminAlerts() {
  const [unreadOnly, setUnreadOnly] = useState(false);
  const { data: notifications, isLoading } = useAdminNotifications(unreadOnly);
  const markRead = useMarkNotificationRead();

  const handleMarkRead = async (id: string) => {
    try {
      await markRead.mutateAsync(id);
      toast.success("Notification marquée comme lue.");
    } catch {
      toast.error("Erreur.");
    }
  };

  return (
    <AdminLayout>
      <PageHeader title="Alertes" description="Centre d'alertes de vérification" />

      <div className="flex gap-2 mb-6">
        <Button
          variant={unreadOnly ? "default" : "outline"}
          size="sm"
          onClick={() => setUnreadOnly(!unreadOnly)}
          className="gap-1.5 text-xs"
        >
          {unreadOnly ? <BellOff className="h-3 w-3" /> : <Bell className="h-3 w-3" />}
          {unreadOnly ? "Non lues seulement" : "Toutes les alertes"}
        </Button>
      </div>

      {isLoading && <LoadingState />}

      {!isLoading && (!notifications || notifications.length === 0) && (
        <EmptyState message="Aucune alerte pour le moment." icon={<CheckCircle2 className="h-6 w-6 text-success" />} />
      )}

      <div className="space-y-3">
        {(notifications ?? []).map((n: any) => {
          const cfg = SEVERITY_CONFIG[n.severity] ?? SEVERITY_CONFIG.info;
          const Icon = cfg.icon;

          return (
            <Card key={n.id} className={`${cfg.className} ${!n.is_read ? "ring-1 ring-primary/20" : "opacity-75"}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Icon className="h-4 w-4 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-foreground">{n.title}</span>
                      <Badge variant="outline" className="text-[9px]">{n.type}</Badge>
                      <Badge variant="outline" className="text-[9px]">{n.severity}</Badge>
                      {!n.is_read && <span className="h-2 w-2 rounded-full bg-primary shrink-0" />}
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{n.body}</p>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span>{new Date(n.created_at).toLocaleString("fr-CA")}</span>
                      {n.contractors?.business_name && <span>• {n.contractors.business_name}</span>}
                    </div>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    {n.verification_run_id && (
                      <Link to={`/admin/verification/${n.verification_run_id}`}>
                        <Button variant="ghost" size="icon" className="h-7 w-7"><Eye className="h-3.5 w-3.5" /></Button>
                      </Link>
                    )}
                    {!n.is_read && (
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleMarkRead(n.id)}>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </AdminLayout>
  );
}
