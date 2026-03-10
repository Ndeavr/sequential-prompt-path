import { Link } from "react-router-dom";
import DashboardLayout from "@/layouts/DashboardLayout";
import { PageHeader, LoadingState, EmptyState } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAppointments, useUpdateAppointmentStatus } from "@/hooks/useAppointments";
import { Search } from "lucide-react";
import { toast } from "sonner";

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

const HomeownerAppointments = () => {
  const { data: appointments, isLoading } = useAppointments();
  const updateStatus = useUpdateAppointmentStatus();

  const handleCancel = async (id: string) => {
    try {
      await updateStatus.mutateAsync({ id, status: "cancelled" });
      toast.success("Rendez-vous annulé.");
    } catch {
      toast.error("Erreur lors de l'annulation.");
    }
  };

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
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Entrepreneur</TableHead>
                <TableHead>Propriété</TableHead>
                <TableHead>Date souhaitée</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Demandé le</TableHead>
                <TableHead></TableHead>
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
                    {a.status === "requested" && (
                      <Button variant="ghost" size="sm" onClick={() => handleCancel(a.id)} disabled={updateStatus.isPending}>
                        Annuler
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </DashboardLayout>
  );
};

export default HomeownerAppointments;
