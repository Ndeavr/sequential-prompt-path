import AdminLayout from "@/layouts/AdminLayout";
import { StatCard, LoadingState, PageHeader } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAdminStats, useAdminRecentActivity } from "@/hooks/useAdmin";
import { Users, Briefcase, Home, FileText, Star, FolderOpen, AlertCircle, Clock } from "lucide-react";
import { Link } from "react-router-dom";

const AdminDashboard = () => {
  const { data: stats, isLoading } = useAdminStats();
  const { data: recent } = useAdminRecentActivity();

  if (isLoading) return <AdminLayout><LoadingState /></AdminLayout>;

  return (
    <AdminLayout>
      <PageHeader title="Administration" description="Vue d'ensemble de la plateforme" />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Utilisateurs" value={stats?.users ?? 0} icon={<Users className="h-4 w-4" />} />
        <StatCard title="Entrepreneurs" value={stats?.contractors ?? 0} icon={<Briefcase className="h-4 w-4" />} />
        <StatCard title="À vérifier" value={stats?.contractorsNeedingReview ?? 0} icon={<AlertCircle className="h-4 w-4" />} description="Entrepreneurs non vérifiés" />
        <StatCard title="Propriétés" value={stats?.properties ?? 0} icon={<Home className="h-4 w-4" />} />
        <StatCard title="Soumissions" value={stats?.quotes ?? 0} icon={<FileText className="h-4 w-4" />} />
        <StatCard title="Analyses en attente" value={stats?.pendingAnalyses ?? 0} icon={<Clock className="h-4 w-4" />} />
        <StatCard title="Documents" value={stats?.documents ?? 0} icon={<FolderOpen className="h-4 w-4" />} />
        <StatCard title="Avis" value={stats?.reviews ?? 0} icon={<Star className="h-4 w-4" />} />
      </div>

      {/* Recent activity */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">Inscriptions récentes</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {recent?.signups?.length ? recent.signups.map((s: any) => (
              <div key={s.user_id} className="flex items-center justify-between text-sm">
                <span>{s.full_name || s.email || "—"}</span>
                <span className="text-muted-foreground text-xs">{new Date(s.created_at).toLocaleDateString("fr-CA")}</span>
              </div>
            )) : <p className="text-sm text-muted-foreground">Aucune inscription récente.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Entrepreneurs récents</CardTitle>
              <Link to="/admin/contractors" className="text-xs text-primary hover:underline">Voir tout</Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {recent?.contractors?.length ? recent.contractors.map((c: any) => (
              <div key={c.id} className="flex items-center justify-between text-sm">
                <span>{c.business_name}</span>
                <Badge variant="outline" className="text-xs">{c.verification_status}</Badge>
              </div>
            )) : <p className="text-sm text-muted-foreground">Aucun entrepreneur récent.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Documents récents</CardTitle>
              <Link to="/admin/documents" className="text-xs text-primary hover:underline">Voir tout</Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {recent?.documents?.length ? recent.documents.map((d: any) => (
              <div key={d.id} className="flex items-center justify-between text-sm">
                <span className="truncate max-w-[200px]">{d.file_name}</span>
                <span className="text-muted-foreground text-xs">{d.bucket}</span>
              </div>
            )) : <p className="text-sm text-muted-foreground">Aucun document récent.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Soumissions récentes</CardTitle>
              <Link to="/admin/quotes" className="text-xs text-primary hover:underline">Voir tout</Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {recent?.quotes?.length ? recent.quotes.map((q: any) => (
              <div key={q.id} className="flex items-center justify-between text-sm">
                <span className="truncate max-w-[200px]">{q.title}</span>
                <Badge variant="secondary" className="text-xs">{q.status}</Badge>
              </div>
            )) : <p className="text-sm text-muted-foreground">Aucune soumission récente.</p>}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
