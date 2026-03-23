/**
 * UNPRO Condos — Requests Page (multi-role)
 */
import CondoLayout from "@/layouts/CondoLayout";
import { useCondoRole } from "@/hooks/useCondoRole";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { Plus, ClipboardList, Clock, CheckCircle2, AlertTriangle, Wrench } from "lucide-react";

const mockRequests = [
  { id: "1", title: "Fuite robinet unité 302", unit: "302", status: "open", priority: "high", date: "2026-03-20" },
  { id: "2", title: "Remplacement luminaire corridor 2e étage", unit: "Commun", status: "assigned", priority: "medium", date: "2026-03-18" },
  { id: "3", title: "Fissure fondation garage", unit: "Commun", status: "completed", priority: "high", date: "2026-03-10" },
  { id: "4", title: "Bruit ventilation unité 105", unit: "105", status: "open", priority: "low", date: "2026-03-22" },
];

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof Clock }> = {
  open: { label: "Ouvert", variant: "destructive", icon: AlertTriangle },
  assigned: { label: "Assigné", variant: "default", icon: Wrench },
  completed: { label: "Complété", variant: "secondary", icon: CheckCircle2 },
};

export default function CondoRequestsPage() {
  const { isOwner, isManager, isBoard } = useCondoRole();

  const requests = isOwner
    ? mockRequests.filter(r => r.unit !== "Commun")
    : mockRequests;

  return (
    <CondoLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">
              {isOwner ? "Mes demandes" : "Demandes de service"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isOwner ? "Suivez vos demandes de maintenance et réparation" : "Gérez toutes les demandes de l'immeuble"}
            </p>
          </div>
          <Button asChild className="rounded-xl gap-2">
            <Link to="/condos/requests/new">
              <Plus className="h-4 w-4" />
              Nouvelle demande
            </Link>
          </Button>
        </div>

        {/* Stats */}
        {(isManager || isBoard) && (
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Ouvertes", value: mockRequests.filter(r => r.status === "open").length, color: "text-destructive" },
              { label: "Assignées", value: mockRequests.filter(r => r.status === "assigned").length, color: "text-primary" },
              { label: "Complétées", value: mockRequests.filter(r => r.status === "completed").length, color: "text-muted-foreground" },
            ].map((s) => (
              <Card key={s.label} className="border-border/30">
                <CardContent className="p-4 text-center">
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Request list */}
        <div className="space-y-3">
          {requests.map((req) => {
            const sc = statusConfig[req.status] || statusConfig.open;
            return (
              <Card key={req.id} className="border-border/30 hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-muted/50 flex items-center justify-center flex-shrink-0">
                    <sc.icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground truncate">{req.title}</p>
                    <p className="text-xs text-muted-foreground">Unité {req.unit} · {req.date}</p>
                  </div>
                  <Badge variant={sc.variant} className="text-xs">{sc.label}</Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </CondoLayout>
  );
}
