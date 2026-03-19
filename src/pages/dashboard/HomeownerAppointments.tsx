import { Link } from "react-router-dom";
import DashboardLayout from "@/layouts/DashboardLayout";
import { PageHeader, LoadingState, EmptyState } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAppointments, useUpdateAppointmentStatus } from "@/hooks/useAppointments";
import AppointmentActions from "@/components/appointments/AppointmentActions";
import AppointmentFeedbackForm from "@/components/appointments/AppointmentFeedbackForm";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

const statusLabels: Record<string, string> = {
  requested: "Demandé",
  under_review: "En révision",
  accepted: "Accepté",
  declined: "Refusé",
  scheduled: "Planifié",
  confirmed: "Confirmé",
  reschedule_requested: "Replanification demandée",
  completed: "Terminé",
  cancelled: "Annulé",
};

const statusVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  requested: "secondary",
  under_review: "outline",
  accepted: "default",
  declined: "destructive",
  scheduled: "default",
  confirmed: "default",
  reschedule_requested: "outline",
  completed: "default",
  cancelled: "destructive",
};

const HomeownerAppointments = () => {
  const { data: appointments, isLoading, refetch } = useAppointments();
  const [feedbackFor, setFeedbackFor] = useState<string | null>(null);

  return (
    <DashboardLayout>
      <PageHeader
        title="Rendez-vous"
        description="Vos demandes de rendez-vous"
        action={
          <Button asChild variant="outline">
            <Link to="/search"><Search className="h-4 w-4 mr-1" /> Trouver un entrepreneur</Link>
          </Button>
        }
      />
      {isLoading ? <LoadingState /> : !appointments?.length ? (
        <EmptyState
          message="Aucun rendez-vous."
          action={<Button asChild><Link to="/search">Trouver un entrepreneur</Link></Button>}
        />
      ) : (
        <div className="space-y-4">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Entrepreneur</TableHead>
                  <TableHead>Propriété</TableHead>
                  <TableHead>Date souhaitée</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Demandé le</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {appointments.map((a: any) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">
                      <Link to={`/contractors/${a.contractor_id}`} className="hover:underline text-primary">
                        {a.contractors?.business_name || "—"}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{a.properties?.address || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {a.preferred_date ? new Date(a.preferred_date).toLocaleDateString("fr-CA") : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariants[a.status] ?? "secondary"}>
                        {statusLabels[a.status] ?? a.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(a.created_at).toLocaleDateString("fr-CA")}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-2">
                        <AppointmentActions
                          appointmentId={a.id}
                          status={a.status}
                          role="homeowner"
                          onDone={() => refetch()}
                        />
                        {a.status === "completed" && (
                          <Button size="sm" variant="outline" onClick={() => setFeedbackFor(a.id)}>
                            Laisser un avis
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {feedbackFor && (
            <div className="max-w-md">
              <AppointmentFeedbackForm
                appointmentId={feedbackFor}
                onDone={() => { setFeedbackFor(null); refetch(); }}
              />
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
};

export default HomeownerAppointments;
