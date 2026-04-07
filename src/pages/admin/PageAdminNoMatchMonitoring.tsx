/**
 * PageAdminNoMatchMonitoring — Admin dashboard for no-match analytics
 */
import { Helmet } from "react-helmet-async";
import { useNoMatchStats } from "@/hooks/useNoMatchRecovery";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Users, CheckCircle2, BarChart3, MapPin, Wrench } from "lucide-react";

export default function PageAdminNoMatchMonitoring() {
  const { data: stats, isLoading } = useNoMatchStats();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground animate-pulse">Chargement des données…</p>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>No Match Monitoring — Admin UNPRO</title>
      </Helmet>
      <div className="min-h-screen bg-background p-4 md:p-8 space-y-6 max-w-5xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold text-foreground">No Match Monitoring</h1>
          <p className="text-sm text-muted-foreground mt-1">Suivi des cas sans correspondance et liste d'attente</p>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4 text-center">
              <AlertTriangle className="h-5 w-5 text-warning mx-auto mb-1" />
              <p className="text-2xl font-bold">{stats?.total_no_match_cases || 0}</p>
              <p className="text-xs text-muted-foreground">Cas no-match</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Users className="h-5 w-5 text-primary mx-auto mb-1" />
              <p className="text-2xl font-bold">{stats?.active_waitlist || 0}</p>
              <p className="text-xs text-muted-foreground">En attente</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <CheckCircle2 className="h-5 w-5 text-primary mx-auto mb-1" />
              <p className="text-2xl font-bold">{stats?.matched_waitlist || 0}</p>
              <p className="text-xs text-muted-foreground">Matchés</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <BarChart3 className="h-5 w-5 text-primary mx-auto mb-1" />
              <p className="text-2xl font-bold">{stats?.conversion_rate || 0}%</p>
              <p className="text-xs text-muted-foreground">Taux conversion</p>
            </CardContent>
          </Card>
        </div>

        {/* Top services */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Wrench className="h-4 w-4" /> Services les plus demandés sans match
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(stats?.top_services || []).length === 0 && (
                <p className="text-sm text-muted-foreground">Aucune donnée encore</p>
              )}
              {(stats?.top_services || []).map(([svc, count]) => (
                <div key={svc} className="flex items-center justify-between">
                  <span className="text-sm text-foreground">{svc}</span>
                  <Badge variant="secondary">{count}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-4 w-4" /> Zones géographiques non couvertes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(stats?.top_cities || []).length === 0 && (
                <p className="text-sm text-muted-foreground">Aucune donnée encore</p>
              )}
              {(stats?.top_cities || []).map(([city, count]) => (
                <div key={city} className="flex items-center justify-between">
                  <span className="text-sm text-foreground">{city}</span>
                  <Badge variant="secondary">{count}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
