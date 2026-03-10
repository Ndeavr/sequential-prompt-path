import { Link } from "react-router-dom";
import DashboardLayout from "@/layouts/DashboardLayout";
import { StatCard, EmptyState, LoadingState, PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useProperties } from "@/hooks/useProperties";
import { useQuotes } from "@/hooks/useQuotes";
import { useAppointments } from "@/hooks/useAppointments";
import { calculateHomeScore } from "@/services/homeScoreService";
import { Home, FileText, BarChart3, Plus, CalendarDays } from "lucide-react";

const Dashboard = () => {
  const { data: properties, isLoading: pLoading } = useProperties();
  const { data: quotes, isLoading: qLoading } = useQuotes();
  const { data: appointments, isLoading: aLoading } = useAppointments();

  const isLoading = pLoading || qLoading || aLoading;

  // Compute best home score
  const bestScore = (properties ?? []).reduce((best, p) => {
    const s = calculateHomeScore({
      yearBuilt: p.year_built, propertyType: p.property_type, squareFootage: p.square_footage,
      condition: p.condition, hasInspectionReports: false, uploadedDocumentCount: 0,
      quoteCount: 0, renovationCount: 0, recentRepairCount: 0,
    });
    return s.overall > best ? s.overall : best;
  }, 0);

  if (isLoading) return <DashboardLayout><LoadingState /></DashboardLayout>;

  return (
    <DashboardLayout>
      <PageHeader title="Tableau de bord" description="Vue d'ensemble de vos propriétés et soumissions" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Propriétés" value={properties?.length ?? 0} icon={<Home className="h-4 w-4" />} />
        <StatCard title="Soumissions" value={quotes?.length ?? 0} icon={<FileText className="h-4 w-4" />} />
        <StatCard title="Rendez-vous" value={appointments?.length ?? 0} icon={<CalendarDays className="h-4 w-4" />} />
        <StatCard title="Score maison" value={bestScore > 0 ? `${bestScore}/100` : "—"} icon={<BarChart3 className="h-4 w-4" />} />
      </div>

      {/* Home Score Alert */}
      {properties?.length ? (
        <Card className="mb-6">
          <CardContent className="flex items-center justify-between pt-6">
            <div>
              <p className="text-sm font-medium">Intelligence propriété</p>
              <p className="text-xs text-muted-foreground">Découvrez le score et les recommandations pour vos propriétés</p>
            </div>
            <Button asChild size="sm"><Link to="/dashboard/home-score">Voir les scores</Link></Button>
          </CardContent>
        </Card>
      ) : null}

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
        <Button asChild variant="outline"><Link to="/dashboard/appointments">Mes rendez-vous</Link></Button>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
