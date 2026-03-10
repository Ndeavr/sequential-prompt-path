import ContractorLayout from "@/layouts/ContractorLayout";
import { PageHeader, LoadingState, EmptyState } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useContractorAppointments, useUpdateAppointmentStatus } from "@/hooks/useAppointments";
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

const ProAppointments = () => {
  const { data: appointments, isLoading } = useContractorAppointments();
  const updateStatus = useUpdateAppointmentStatus();

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await updateStatus.mutateAsync({ id, status });
      toast.success("Statut mis à jour.");
    } catch {
      toast.error("Erreur lors de la mise à jour.");
    }
  };

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
                <TableHead>Action</TableHead>
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
                    {["requested", "under_review", "accepted"].includes(a.status) && (
                      <Select onValueChange={(v) => handleStatusChange(a.id, v)}>
                        <SelectTrigger className="w-[140px] h-8 text-xs">
                          <SelectValue placeholder="Changer…" />
                        </SelectTrigger>
                        <SelectContent>
                          {a.status === "requested" && <SelectItem value="under_review">En révision</SelectItem>}
                          {["requested", "under_review"].includes(a.status) && (
                            <>
                              <SelectItem value="accepted">Accepter</SelectItem>
                              <SelectItem value="declined">Refuser</SelectItem>
                            </>
                          )}
                          {a.status === "accepted" && <SelectItem value="scheduled">Planifier</SelectItem>}
                          {["accepted", "scheduled"].includes(a.status) && <SelectItem value="completed">Terminé</SelectItem>}
                        </SelectContent>
                      </Select>
                    )}
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
