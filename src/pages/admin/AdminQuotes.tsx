import AdminLayout from "@/layouts/AdminLayout";
import { PageHeader, LoadingState, EmptyState } from "@/components/shared";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useAdminQuotes } from "@/hooks/useAdmin";

const AdminQuotes = () => {
  const { data: quotes, isLoading } = useAdminQuotes();

  return (
    <AdminLayout>
      <PageHeader title="Soumissions" description="Toutes les soumissions de la plateforme" />
      {isLoading ? <LoadingState /> : !quotes?.length ? <EmptyState message="Aucune soumission." /> : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Titre</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quotes.map((q) => (
                <TableRow key={q.id}>
                  <TableCell className="font-medium">{q.title}</TableCell>
                  <TableCell>{q.amount ? `${q.amount.toLocaleString()} $` : "—"}</TableCell>
                  <TableCell><Badge variant="secondary">{q.status}</Badge></TableCell>
                  <TableCell className="text-muted-foreground">{new Date(q.created_at).toLocaleDateString("fr-CA")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminQuotes;
