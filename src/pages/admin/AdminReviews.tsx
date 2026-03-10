import AdminLayout from "@/layouts/AdminLayout";
import { PageHeader, LoadingState, EmptyState } from "@/components/shared";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAdminReviews } from "@/hooks/useAdmin";

const AdminReviews = () => {
  const { data: reviews, isLoading } = useAdminReviews();

  return (
    <AdminLayout>
      <PageHeader title="Avis" description="Tous les avis de la plateforme" />
      {isLoading ? <LoadingState /> : !reviews?.length ? <EmptyState message="Aucun avis." /> : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Entrepreneur</TableHead>
                <TableHead>Note</TableHead>
                <TableHead>Titre</TableHead>
                <TableHead>Publié</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reviews.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{(r as any).contractors?.business_name || "—"}</TableCell>
                  <TableCell>{"★".repeat(r.rating)}</TableCell>
                  <TableCell className="text-muted-foreground">{r.title || "—"}</TableCell>
                  <TableCell>{r.is_published ? "Oui" : "Non"}</TableCell>
                  <TableCell className="text-muted-foreground">{new Date(r.created_at).toLocaleDateString("fr-CA")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminReviews;
