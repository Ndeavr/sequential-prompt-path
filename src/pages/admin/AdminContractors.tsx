import AdminLayout from "@/layouts/AdminLayout";
import { PageHeader, LoadingState, EmptyState } from "@/components/shared";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useAdminContractors } from "@/hooks/useAdmin";

const AdminContractors = () => {
  const { data: contractors, isLoading } = useAdminContractors();

  return (
    <AdminLayout>
      <PageHeader title="Entrepreneurs" description="Liste des profils entrepreneurs" />
      {isLoading ? <LoadingState /> : !contractors?.length ? <EmptyState message="Aucun entrepreneur." /> : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Entreprise</TableHead>
                <TableHead>Spécialité</TableHead>
                <TableHead>Ville</TableHead>
                <TableHead>Vérification</TableHead>
                <TableHead>Score AIPP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contractors.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.business_name}</TableCell>
                  <TableCell className="text-muted-foreground">{c.specialty || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{c.city || "—"}</TableCell>
                  <TableCell><Badge variant="outline">{c.verification_status}</Badge></TableCell>
                  <TableCell>{c.aipp_score ?? 0}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminContractors;
