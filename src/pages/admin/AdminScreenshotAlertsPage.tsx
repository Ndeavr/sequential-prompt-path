/**
 * UNPRO — Admin Screenshot Alerts Page
 */
import { useState } from "react";
import AdminLayout from "@/layouts/AdminLayout";
import { PageHeader, LoadingState, EmptyState } from "@/components/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAdminScreenshotAlerts } from "@/hooks/screenshot/useScreenshotAnalytics";
import { Bell, BellOff, CheckCircle2, XCircle, AlertTriangle, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

const SEV_CONFIG: Record<string, { icon: React.ElementType; className: string }> = {
  critical: { icon: XCircle, className: "border-destructive/30 bg-destructive/5" },
  warning: { icon: ShieldAlert, className: "border-warning/30 bg-warning/5" },
  info: { icon: Bell, className: "border-border/40 bg-card/80" },
};

export default function AdminScreenshotAlertsPage() {
  const [filter, setFilter] = useState<string | undefined>(undefined);
  const { data: alerts, isLoading } = useAdminScreenshotAlerts(filter);
  const qc = useQueryClient();

  const resolve = async (id: string) => {
    const { error } = await supabase
      .from("screenshot_alerts")
      .update({ status: "resolved", resolved_at: new Date().toISOString() })
      .eq("id", id);
    if (error) { toast.error("Erreur"); return; }
    toast.success("Alerte résolue");
    qc.invalidateQueries({ queryKey: ["screenshot_alerts"] });
  };

  if (isLoading) return <AdminLayout><LoadingState /></AdminLayout>;

  return (
    <AdminLayout>
      <PageHeader title="Alertes Screenshot" description="Alertes automatiques de friction et d'usage" />

      <div className="flex gap-2 mb-6">
        {[undefined, "open", "resolved"].map((f) => (
          <Button
            key={f ?? "all"}
            variant={filter === f ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f)}
            className="text-xs"
          >
            {f === "open" ? "Ouvertes" : f === "resolved" ? "Résolues" : "Toutes"}
          </Button>
        ))}
      </div>

      {!alerts?.length ? (
        <EmptyState message="Aucune alerte." icon={<CheckCircle2 className="h-6 w-6 text-success" />} />
      ) : (
        <div className="space-y-3">
          {alerts.map((a: any) => {
            const cfg = SEV_CONFIG[a.severity] ?? SEV_CONFIG.info;
            const Icon = cfg.icon;
            return (
              <Card key={a.id} className={`${cfg.className} ${a.status === "open" ? "ring-1 ring-primary/20" : "opacity-70"}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Icon className="h-4 w-4 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold">{a.title}</span>
                        <Badge variant="outline" className="text-[9px]">{a.alert_type}</Badge>
                        <Badge variant="outline" className="text-[9px]">{a.severity}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-1">{a.description}</p>
                      <span className="text-[10px] text-muted-foreground">
                        {a.screen_key} • {new Date(a.created_at).toLocaleString("fr-CA")}
                      </span>
                    </div>
                    {a.status === "open" && (
                      <Button variant="ghost" size="sm" onClick={() => resolve(a.id)} className="h-7 text-xs shrink-0">
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Résoudre
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </AdminLayout>
  );
}
