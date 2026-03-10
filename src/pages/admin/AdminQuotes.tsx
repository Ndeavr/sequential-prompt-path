import AdminLayout from "@/layouts/AdminLayout";
import { PageHeader, LoadingState, EmptyState } from "@/components/shared";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useAdminQuotes } from "@/hooks/useAdmin";

const analysisLabel: Record<string, string> = {
  pending: "En attente",
  processing: "En cours",
  completed: "Complétée",
  failed: "Échouée",
};

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
                <TableHead>Propriété</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Analyse</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quotes.map((q: any) => {
                const analysis = q.quote_analysis?.[0];
                return (
                  <TableRow key={q.id}>
                    <TableCell className="font-medium">{q.title}</TableCell>
                    <TableCell className="text-muted-foreground">{q.properties?.address || "—"}</TableCell>
                    <TableCell>{q.amount ? `${q.amount.toLocaleString("fr-CA")} $` : "—"}</TableCell>
                    <TableCell><Badge variant="secondary">{q.status}</Badge></TableCell>
                    <TableCell>
                      {analysis ? (
                        <span className="text-xs">
                          {analysisLabel[analysis.status] ?? analysis.status}
                          {analysis.fairness_score != null && ` · ${analysis.fairness_score}/100`}
                        </span>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{new Date(q.created_at).toLocaleDateString("fr-CA")}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminQuotes;
