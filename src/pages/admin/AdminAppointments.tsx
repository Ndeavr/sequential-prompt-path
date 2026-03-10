import AdminLayout from "@/layouts/AdminLayout";
import { PageHeader, LoadingState, EmptyState } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAdminAppointments } from "@/hooks/useAppointments";

const statusLabels: Record<string, string> = {
  requested: "Demandé",
  under_review: "En révision",
  accepted: "Accepté",
  declined: "Refusé",
  scheduled: "Planifié",
  completed: "Terminé",
  cancelled: "Annulé",
};

const statusVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  requested: "secondary",
  under_review: "outline",
  accepted: "default",
  declined: "destructive",
  scheduled: "default",
  completed: "default",
  cancelled: "destructive",
};

const AdminAppointments = () => {
  const { data: appointments, isLoading } = useAdminAppointments();

  return (
    <AdminLayout>
      <PageHeader title="Rendez-vous" description="Tous les rendez-vous de la plateforme" />
      {isLoading ? <LoadingState /> : !appointments?.length ? (
        <EmptyState message="Aucun rendez-vous." />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Entrepreneur</TableHead>
                <TableHead>Propriété</TableHead>
                <TableHead>Date souhaitée</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Créé le</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {appointments.map((a: any) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.contractors?.business_name || "—"}</TableCell>
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminAppointments;
