import { Link } from "react-router-dom";
import DashboardLayout from "@/layouts/DashboardLayout";
import { PageHeader, LoadingState, EmptyState } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuotes } from "@/hooks/useQuotes";
import { Plus } from "lucide-react";
import { format } from "date-fns";

const statusColors: Record<string, string> = {
  pending: "secondary",
  analyzed: "default",
  accepted: "default",
  rejected: "destructive",
};

const QuotesList = () => {
  const { data: quotes, isLoading } = useQuotes();

  return (
    <DashboardLayout>
      <PageHeader
        title="Soumissions"
        description="Vos soumissions d'entrepreneurs"
        action={<Button asChild><Link to="/dashboard/quotes/upload"><Plus className="h-4 w-4 mr-1" /> Téléverser</Link></Button>}
      />
      {isLoading ? <LoadingState /> : !quotes?.length ? (
        <EmptyState message="Aucune soumission." action={<Button asChild><Link to="/dashboard/quotes/upload">Téléverser une soumission</Link></Button>} />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Titre</TableHead>
                <TableHead>Propriété</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quotes.map((q) => (
                <TableRow key={q.id}>
                  <TableCell className="font-medium">{q.title}</TableCell>
                  <TableCell className="text-muted-foreground">{(q as any).properties?.address || "—"}</TableCell>
                  <TableCell>{q.amount ? `${q.amount.toLocaleString()} $` : "—"}</TableCell>
                  <TableCell><Badge variant={(statusColors[q.status ?? ""] as any) || "secondary"}>{q.status}</Badge></TableCell>
                  <TableCell className="text-muted-foreground">{format(new Date(q.created_at), "dd/MM/yyyy")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </DashboardLayout>
  );
};

export default QuotesList;
