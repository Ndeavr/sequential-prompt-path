import ContractorLayout from "@/layouts/ContractorLayout";
import { PageHeader, LoadingState, EmptyState } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useContractorAppointments } from "@/hooks/useAppointments";
import AppointmentActions from "@/components/appointments/AppointmentActions";
import OnTheWayButton from "@/components/contractor/OnTheWayButton";

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

const ProAppointments = () => {
  const { data: appointments, isLoading, refetch } = useContractorAppointments();

  return (
    <ContractorLayout>
      <PageHeader title="Rendez-vous" description="Demandes de rendez-vous reçues" />
      {isLoading ? <LoadingState /> : !appointments?.length ? (
        <EmptyState message="Aucune demande de rendez-vous." />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Propriété</TableHead>
                <TableHead>Date souhaitée</TableHead>
                <TableHead>Plage</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Reçu le</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {appointments.map((a: any) => (
                <TableRow key={a.id}>
                  <TableCell className="text-muted-foreground">{a.properties?.address || "Non précisée"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {a.preferred_date ? new Date(a.preferred_date).toLocaleDateString("fr-CA") : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{a.preferred_time_window || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{a.contact_preference || "—"}</TableCell>
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
                        role="contractor"
                        onDone={() => refetch()}
                      />
                      {["confirmed", "scheduled"].includes(a.status) && (
                        <OnTheWayButton
                          appointmentId={a.id}
                          alreadyEnRoute={!!a.contractor_en_route_at}
                          onDone={() => refetch()}
                        />
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </ContractorLayout>
  );
};

export default ProAppointments;
