import { Link } from "react-router-dom";
import DashboardLayout from "@/layouts/DashboardLayout";
import { StatCard, EmptyState, LoadingState, PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useProperties } from "@/hooks/useProperties";
import { useQuotes } from "@/hooks/useQuotes";
import { useHomeScores } from "@/hooks/useHomeScore";
import { Home, FileText, BarChart3, Plus } from "lucide-react";

const Dashboard = () => {
  const { data: properties, isLoading: pLoading } = useProperties();
  const { data: quotes, isLoading: qLoading } = useQuotes();
  const { data: scores, isLoading: sLoading } = useHomeScores();

  const isLoading = pLoading || qLoading || sLoading;

  if (isLoading) return <DashboardLayout><LoadingState /></DashboardLayout>;

  return (
    <DashboardLayout>
      <PageHeader title="Tableau de bord" description="Vue d'ensemble de vos propriétés et soumissions" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <StatCard title="Propriétés" value={properties?.length ?? 0} icon={<Home className="h-4 w-4" />} />
        <StatCard title="Soumissions" value={quotes?.length ?? 0} icon={<FileText className="h-4 w-4" />} />
        <StatCard title="Scores maison" value={scores?.length ?? 0} icon={<BarChart3 className="h-4 w-4" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Properties */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Propriétés récentes</CardTitle>
            <Button asChild size="sm"><Link to="/dashboard/properties/new"><Plus className="h-4 w-4 mr-1" /> Ajouter</Link></Button>
          </CardHeader>
          <CardContent>
            {!properties?.length ? (
              <EmptyState message="Aucune propriété ajoutée." action={<Button asChild variant="outline" size="sm"><Link to="/dashboard/properties/new">Ajouter une propriété</Link></Button>} />
            ) : (
              <ul className="space-y-2">
                {properties.slice(0, 5).map((p) => (
                  <li key={p.id}>
                    <Link to={`/dashboard/properties/${p.id}`} className="flex justify-between items-center py-2 px-3 rounded-md hover:bg-accent transition-colors">
                      <span className="text-sm font-medium">{p.address}</span>
                      <span className="text-xs text-muted-foreground">{p.city}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Quotes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Soumissions récentes</CardTitle>
            <Button asChild size="sm"><Link to="/dashboard/quotes/upload"><Plus className="h-4 w-4 mr-1" /> Téléverser</Link></Button>
          </CardHeader>
          <CardContent>
            {!quotes?.length ? (
              <EmptyState message="Aucune soumission." action={<Button asChild variant="outline" size="sm"><Link to="/dashboard/quotes/upload">Téléverser une soumission</Link></Button>} />
            ) : (
              <ul className="space-y-2">
                {quotes.slice(0, 5).map((q) => (
                  <li key={q.id} className="flex justify-between items-center py-2 px-3 rounded-md hover:bg-accent transition-colors">
                    <span className="text-sm font-medium">{q.title}</span>
                    <span className="text-xs text-muted-foreground capitalize">{q.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* CTAs */}
      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild variant="outline"><Link to="/search">Trouver un entrepreneur</Link></Button>
        <Button asChild variant="outline"><Link to="/dashboard/home-score">Voir mon score maison</Link></Button>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
