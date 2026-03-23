/**
 * UNPRO Condos — Incidents Page
 */
import CondoLayout from "@/layouts/CondoLayout";
import { useCondoRole } from "@/hooks/useCondoRole";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { Plus, AlertTriangle, Clock, CheckCircle2 } from "lucide-react";

const mockIncidents = [
  { id: "1", title: "Dégât d'eau corridor 3e", severity: "high", status: "open", reported: "2026-03-22" },
  { id: "2", title: "Vitre brisée entrée principale", severity: "medium", status: "in_progress", reported: "2026-03-20" },
  { id: "3", title: "Graffiti mur extérieur", severity: "low", status: "resolved", reported: "2026-03-15" },
];

const severityColors: Record<string, string> = {
  high: "text-destructive bg-destructive/10",
  medium: "text-amber-500 bg-amber-500/10",
  low: "text-muted-foreground bg-muted/50",
};

export default function CondoIncidentsPage() {
  const { isOwner } = useCondoRole();

  return (
    <CondoLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Incidents</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isOwner ? "Signalez et suivez les problèmes" : "Gérez les incidents signalés"}
            </p>
          </div>
          <Button className="rounded-xl gap-2">
            <Plus className="h-4 w-4" /> Signaler
          </Button>
        </div>

        <div className="space-y-3">
          {mockIncidents.map((inc) => (
            <Card key={inc.id} className="border-border/30">
              <CardContent className="p-4 flex items-center gap-4">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${severityColors[inc.severity]}`}>
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground">{inc.title}</p>
                  <p className="text-xs text-muted-foreground">Signalé le {inc.reported}</p>
                </div>
                <Badge variant={inc.status === "resolved" ? "secondary" : inc.status === "in_progress" ? "default" : "destructive"}>
                  {inc.status === "resolved" ? "Résolu" : inc.status === "in_progress" ? "En cours" : "Ouvert"}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </CondoLayout>
  );
}
