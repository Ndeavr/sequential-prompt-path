import { useState } from "react";
import AdminLayout from "@/layouts/AdminLayout";
import { PageHeader, LoadingState, EmptyState } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAdminAppointments, useUpdateAppointmentStatus } from "@/hooks/useAppointments";
import {
  ADMIN_ASSIGNABLE_STATUSES,
  APPOINTMENT_STATUS_LABELS,
  APPOINTMENT_STATUS_VARIANTS,
  type AppointmentStatus,
} from "@/types/appointment";

const AdminAppointments = () => {
  const [includeArchived, setIncludeArchived] = useState(false);
  const { data: appointments, isLoading } = useAdminAppointments(includeArchived);
  const updateStatus = useUpdateAppointmentStatus();
  const { toast } = useToast();

  const handleChange = async (id: string, status: string) => {
    try {
      await updateStatus.mutateAsync({ id, status });
      toast({
        title: "Statut mis à jour",
        description: APPOINTMENT_STATUS_LABELS[status as AppointmentStatus] ?? status,
      });
    } catch {
      toast({
        title: "Mise à jour impossible",
        description: "Le statut n'a pas pu être enregistré.",
        variant: "destructive",
      });
    }
  };

  return (
    <AdminLayout>
      <PageHeader title="Rendez-vous" description="Tous les rendez-vous de la plateforme" />

      <div className="mb-4 flex items-center gap-3">
        <Switch id="archives" checked={includeArchived} onCheckedChange={setIncludeArchived} />
        <Label htmlFor="archives" className="text-sm text-muted-foreground">
          Afficher les archives de test
        </Label>
      </div>

      {isLoading ? (
        <LoadingState />
      ) : !appointments?.length ? (
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
                <TableHead>Changer le statut</TableHead>
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
                    <Badge variant={APPOINTMENT_STATUS_VARIANTS[a.status as AppointmentStatus] ?? "secondary"}>
                      {APPOINTMENT_STATUS_LABELS[a.status as AppointmentStatus] ?? a.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {a.status === "archived_test" ? (
                      <span className="text-xs text-muted-foreground">Archive verrouillée</span>
                    ) : (
                      <Select value={a.status} onValueChange={(v) => handleChange(a.id, v)}>
                        <SelectTrigger className="h-8 w-[180px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ADMIN_ASSIGNABLE_STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {APPOINTMENT_STATUS_LABELS[s]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
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
