import AdminLayout from "@/layouts/AdminLayout";
import { PageHeader, LoadingState, EmptyState } from "@/components/shared";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAdminDocuments } from "@/hooks/useAdmin";

const AdminDocuments = () => {
  const { data: docs, isLoading } = useAdminDocuments();

  return (
    <AdminLayout>
      <PageHeader title="Documents" description="Tous les documents téléversés" />
      {isLoading ? <LoadingState /> : !docs?.length ? <EmptyState message="Aucun document." /> : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Bucket</TableHead>
                <TableHead>Taille</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {docs.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.file_name}</TableCell>
                  <TableCell className="text-muted-foreground">{d.file_type || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{d.bucket}</TableCell>
                  <TableCell className="text-muted-foreground">{d.file_size ? `${(d.file_size / 1024).toFixed(0)} Ko` : "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{new Date(d.created_at).toLocaleDateString("fr-CA")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminDocuments;
