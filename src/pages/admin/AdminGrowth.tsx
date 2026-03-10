/**
 * UNPRO — Admin Growth Dashboard
 * Marketplace growth metrics and conversion funnel.
 */

import AdminLayout from "@/layouts/AdminLayout";
import { PageHeader, LoadingState, StatCard } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGrowthMetrics } from "@/hooks/useGrowthMetrics";
import {
  Users,
  Briefcase,
  FileText,
  CalendarCheck,
  CreditCard,
  TrendingUp,
  Target,
  ArrowUpRight,
} from "lucide-react";

const AdminGrowth = () => {
  const { data: m, isLoading } = useGrowthMetrics();

  if (isLoading) return <AdminLayout><LoadingState /></AdminLayout>;
  if (!m) return <AdminLayout><PageHeader title="Croissance" /><p className="text-muted-foreground">Données indisponibles.</p></AdminLayout>;

  const conversionRate = m.totalUsers > 0 ? ((m.totalAppointments / m.totalUsers) * 100).toFixed(1) : "0";
  const paidConversion = m.totalContractors > 0 ? ((m.activeSubscriptions / m.totalContractors) * 100).toFixed(1) : "0";

  return (
    <AdminLayout>
      <PageHeader title="Croissance" description="Métriques de la marketplace" />

      {/* Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <StatCard title="Utilisateurs" value={m.totalUsers} icon={<Users className="h-4 w-4" />} description={`+${m.newUsers7d} cette semaine`} />
        <StatCard title="Entrepreneurs" value={m.totalContractors} icon={<Briefcase className="h-4 w-4" />} description={`+${m.newContractors30d} ce mois`} />
        <StatCard title="Soumissions" value={m.totalQuotes} icon={<FileText className="h-4 w-4" />} description={`+${m.newQuotes30d} ce mois`} />
        <StatCard title="Rendez-vous" value={m.totalAppointments} icon={<CalendarCheck className="h-4 w-4" />} description={`+${m.newAppointments30d} ce mois`} />
      </div>

      {/* Conversion funnel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium flex items-center gap-2"><CreditCard className="h-4 w-4" />Abonnements actifs</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{m.activeSubscriptions}</p>
            <p className="text-sm text-muted-foreground">{paidConversion}% des entrepreneurs</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium flex items-center gap-2"><Target className="h-4 w-4" />Taux de conversion</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{conversionRate}%</p>
            <p className="text-sm text-muted-foreground">Utilisateurs → Rendez-vous</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium flex items-center gap-2"><TrendingUp className="h-4 w-4" />Leads générés</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{m.totalLeads}</p>
            <p className="text-sm text-muted-foreground">Total qualifications</p>
          </CardContent>
        </Card>
      </div>

      {/* Growth 30d */}
      <Card>
        <CardHeader><CardTitle className="text-sm font-medium">Activité 30 derniers jours</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            {[
              { label: "Nouveaux utilisateurs", value: m.newUsers30d },
              { label: "Nouveaux entrepreneurs", value: m.newContractors30d },
              { label: "Nouvelles soumissions", value: m.newQuotes30d },
              { label: "Nouveaux RDV", value: m.newAppointments30d },
            ].map((item) => (
              <div key={item.label}>
                <p className="text-muted-foreground">{item.label}</p>
                <p className="text-lg font-semibold flex items-center gap-1">
                  <ArrowUpRight className="h-4 w-4 text-primary" />
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </AdminLayout>
  );
};

export default AdminGrowth;
