import { useState } from "react";
import { Link } from "react-router-dom";
import AdminLayout from "@/layouts/AdminLayout";
import { PageHeader, LoadingState, EmptyState } from "@/components/shared";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAdminContractors } from "@/hooks/useAdmin";
import { getContractorCompleteness } from "@/services/contractorCompletenessService";
import { Eye } from "lucide-react";

const verificationColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  unverified: "outline",
  pending: "secondary",
  verified: "default",
  rejected: "destructive",
};

const AdminContractors = () => {
  const { data: contractors, isLoading } = useAdminContractors();
  const [statusFilter, setStatusFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("all");

  const cities = [...new Set((contractors ?? []).map((c) => c.city).filter(Boolean))] as string[];

  const filtered = (contractors ?? []).filter((c) => {
    if (statusFilter !== "all" && c.verification_status !== statusFilter) return false;
    if (cityFilter !== "all" && c.city !== cityFilter) return false;
    return true;
  });

  return (
    <AdminLayout>
      <PageHeader title="Entrepreneurs" description="Revue et vérification des profils" />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Statut" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="unverified">Non vérifié</SelectItem>
            <SelectItem value="pending">En attente</SelectItem>
            <SelectItem value="verified">Vérifié</SelectItem>
            <SelectItem value="rejected">Rejeté</SelectItem>
          </SelectContent>
        </Select>
        <Select value={cityFilter} onValueChange={setCityFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Ville" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les villes</SelectItem>
            {cities.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? <LoadingState /> : !filtered.length ? <EmptyState message="Aucun entrepreneur trouvé." /> : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Entreprise</TableHead>
                <TableHead>Ville</TableHead>
                <TableHead>Spécialité</TableHead>
                <TableHead>Vérification</TableHead>
                <TableHead>Complétude</TableHead>
                <TableHead>Score AIPP</TableHead>
                <TableHead>Date</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => {
                const completeness = getContractorCompleteness(c);
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.business_name}</TableCell>
                    <TableCell className="text-muted-foreground">{c.city || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{c.specialty || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={verificationColors[c.verification_status ?? "unverified"] ?? "outline"}>
                        {c.verification_status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className={`text-sm font-medium ${completeness.percentage >= 80 ? "text-green-600 dark:text-green-400" : completeness.percentage >= 50 ? "text-yellow-600 dark:text-yellow-400" : "text-red-600 dark:text-red-400"}`}>
                        {completeness.percentage}%
                      </span>
                    </TableCell>
                    <TableCell>{c.aipp_score ?? 0}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{new Date(c.created_at).toLocaleDateString("fr-CA")}</TableCell>
                    <TableCell>
                      <Button asChild variant="ghost" size="sm">
                        <Link to={`/admin/contractors/${c.id}`}><Eye className="h-4 w-4" /></Link>
                      </Button>
                    </TableCell>
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

export default AdminContractors;
