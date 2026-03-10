import AdminLayout from "@/layouts/AdminLayout";
import { PageHeader, LoadingState, EmptyState } from "@/components/shared";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useAdminUsers } from "@/hooks/useAdmin";

const AdminUsers = () => {
  const { data: users, isLoading } = useAdminUsers();

  return (
    <AdminLayout>
      <PageHeader title="Utilisateurs" description="Liste des utilisateurs inscrits" />
      {isLoading ? <LoadingState /> : !users?.length ? <EmptyState message="Aucun utilisateur." /> : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Courriel</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead>Inscription</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.full_name || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{u.email || "—"}</TableCell>
                    <TableCell>
                      {u.roles.map((role: string) => (
                        <Badge key={role} variant="secondary" className="mr-1">{role}</Badge>
                      ))}
                    </TableCell>
                  <TableCell className="text-muted-foreground">{new Date(u.created_at).toLocaleDateString("fr-CA")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminUsers;
