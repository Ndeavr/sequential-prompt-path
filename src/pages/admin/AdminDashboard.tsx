import AdminLayout from "@/layouts/AdminLayout";
import { StatCard, LoadingState, PageHeader } from "@/components/shared";
import { useAdminStats } from "@/hooks/useAdmin";
import { Users, Briefcase, Home, FileText, Star } from "lucide-react";

const AdminDashboard = () => {
  const { data: stats, isLoading } = useAdminStats();

  if (isLoading) return <AdminLayout><LoadingState /></AdminLayout>;

  return (
    <AdminLayout>
      <PageHeader title="Administration" description="Vue d'ensemble de la plateforme" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard title="Utilisateurs" value={stats?.users ?? 0} icon={<Users className="h-4 w-4" />} />
        <StatCard title="Entrepreneurs" value={stats?.contractors ?? 0} icon={<Briefcase className="h-4 w-4" />} />
        <StatCard title="Propriétés" value={stats?.properties ?? 0} icon={<Home className="h-4 w-4" />} />
        <StatCard title="Soumissions" value={stats?.quotes ?? 0} icon={<FileText className="h-4 w-4" />} />
        <StatCard title="Avis" value={stats?.reviews ?? 0} icon={<Star className="h-4 w-4" />} />
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
