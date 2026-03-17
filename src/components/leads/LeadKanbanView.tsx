import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Eye, GripVertical } from "lucide-react";
import { useUpdateAppointmentStatus } from "@/hooks/useAppointments";
import { toast } from "sonner";

type KanbanColumn = {
  key: string;
  label: string;
  color: string;
  statuses: string[];
};

const COLUMNS: KanbanColumn[] = [
  { key: "new", label: "Nouveau", color: "border-t-blue-500", statuses: ["requested"] },
  { key: "review", label: "En révision", color: "border-t-yellow-500", statuses: ["under_review"] },
  { key: "accepted", label: "Accepté", color: "border-t-green-500", statuses: ["accepted", "scheduled"] },
  { key: "closed", label: "Fermé", color: "border-t-muted-foreground", statuses: ["completed", "declined", "cancelled"] },
];

const nextAction: Record<string, { label: string; status: string }> = {
  requested: { label: "Réviser", status: "under_review" },
  under_review: { label: "Accepter", status: "accepted" },
  accepted: { label: "Planifier", status: "scheduled" },
};

interface LeadKanbanViewProps {
  leads: any[];
}

const LeadKanbanView = ({ leads }: LeadKanbanViewProps) => {
  const updateStatus = useUpdateAppointmentStatus();

  const getColumnLeads = (col: KanbanColumn) =>
    leads.filter((l) => col.statuses.includes(l.appointments?.status ?? "requested"));

  const handleAdvance = async (appt: any) => {
    const action = nextAction[appt.status];
    if (!action) return;
    try {
      await updateStatus.mutateAsync({ id: appt.id, status: action.status });
      toast.success("Statut mis à jour");
    } catch {
      toast.error("Erreur");
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {COLUMNS.map((col) => {
        const colLeads = getColumnLeads(col);
        return (
          <div key={col.key} className="space-y-2">
            <div className={`flex items-center justify-between p-2 rounded-t-md border-t-4 ${col.color} bg-muted/50`}>
              <span className="text-sm font-semibold">{col.label}</span>
              <Badge variant="secondary" className="text-xs">{colLeads.length}</Badge>
            </div>
            <div className="space-y-2 min-h-[100px]">
              {colLeads.map((lead: any) => {
                const appt = lead.appointments;
                const action = nextAction[appt?.status];
                return (
                  <Card key={lead.id} className="group">
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <p className="text-sm font-medium leading-tight">
                            {lead.project_category || "Projet"}
                          </p>
                          <p className="text-xs text-muted-foreground">{lead.city || "—"}</p>
                        </div>
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                          lead.score >= 60 ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                          lead.score >= 35 ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" :
                          "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        }`}>
                          {lead.score}
                        </span>
                      </div>
                      {lead.budget_range && (
                        <p className="text-xs text-muted-foreground">💰 {lead.budget_range}</p>
                      )}
                      <div className="flex items-center gap-1 pt-1">
                        {action && (
                          <Button size="sm" variant="outline" className="h-6 text-xs flex-1"
                            onClick={() => handleAdvance(appt)}>
                            {action.label}
                          </Button>
                        )}
                        <Button asChild size="sm" variant="ghost" className="h-6 w-6 p-0">
                          <Link to={`/pro/leads/${lead.id}`}><Eye className="h-3 w-3" /></Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {colLeads.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6">Aucun</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default LeadKanbanView;
