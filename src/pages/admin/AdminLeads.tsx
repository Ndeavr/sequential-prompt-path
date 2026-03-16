import AdminLayout from "@/layouts/AdminLayout";
import { PageHeader, LoadingState, EmptyState, StatCard } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAdminLeads, useAdminLeadStats } from "@/hooks/useLeads";
import { CalendarCheck, Zap, BarChart3, CalendarDays } from "lucide-react";

const levelLabel = (score: number) => score >= 60 ? "Élevé" : score >= 35 ? "Moyen" : "Faible";

const AdminLeads = () => {
  const { data: leads, isLoading } = useAdminLeads();
  const { data: stats } = useAdminLeadStats();

  return (
    <AdminLayout>
      <PageHeader title="Rendez-vous garantis" description="Intelligence marketplace — rendez-vous exclusifs qualifiés" />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total rendez-vous" value={stats?.total ?? 0} icon={<CalendarCheck className="h-4 w-4" />} />
        <StatCard title="Aujourd'hui" value={stats?.today ?? 0} icon={<CalendarDays className="h-4 w-4" />} />
        <StatCard title="Qualité élevée" value={stats?.highQuality ?? 0} icon={<Zap className="h-4 w-4" />} />
        <StatCard title="Score moyen" value={stats?.avgScore ?? 0} icon={<BarChart3 className="h-4 w-4" />} />
      </div>

      {isLoading ? <LoadingState /> : !leads?.length ? <EmptyState message="Aucun rendez-vous garanti." /> : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Score</TableHead>
                <TableHead>Entrepreneur</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead>Ville</TableHead>
                <TableHead>Urgence</TableHead>
                <TableHead>Budget</TableHead>
                <TableHead>Statut RDV</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((l: any) => (
                <TableRow key={l.id}>
                  <TableCell>
                    <span className={`text-sm font-semibold ${l.score >= 60 ? "text-green-600 dark:text-green-400" : l.score >= 35 ? "text-yellow-600 dark:text-yellow-400" : "text-red-600 dark:text-red-400"}`}>
                      {l.score} — {levelLabel(l.score)}
                    </span>
                  </TableCell>
                  <TableCell className="font-medium">{l.contractors?.business_name || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{l.project_category || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{l.city || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{l.urgency_level || "normal"}</TableCell>
                  <TableCell className="text-muted-foreground">{l.budget_range || "—"}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{l.appointments?.status || "—"}</Badge></TableCell>
                  <TableCell className="text-muted-foreground text-sm">{new Date(l.created_at).toLocaleDateString("fr-CA")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminLeads;
