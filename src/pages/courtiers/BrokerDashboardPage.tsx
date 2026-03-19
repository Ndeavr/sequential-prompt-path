/**
 * UNPRO — Broker Dashboard
 * Main hub: stats, recent leads, profile completion, quick actions.
 */
import MainLayout from "@/layouts/MainLayout";
import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, TrendingUp, Calendar, Star, ArrowRight, MapPin, BarChart3 } from "lucide-react";

export default function BrokerDashboardPage() {
  const { user } = useAuth();

  const { data: broker } = useQuery({
    queryKey: ["broker-profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("broker_profiles")
        .select("*")
        .eq("profile_id", user!.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: leads } = useQuery({
    queryKey: ["broker-leads", broker?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("matches")
        .select("*, leads(*)")
        .eq("broker_id", broker!.id)
        .order("created_at", { ascending: false })
        .limit(10);
      return data ?? [];
    },
    enabled: !!broker?.id,
  });

  const { data: scores } = useQuery({
    queryKey: ["broker-scores", broker?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("broker_scores")
        .select("*")
        .eq("broker_id", broker!.id)
        .single();
      return data;
    },
    enabled: !!broker?.id,
  });

  const completionFields = broker ? [
    broker.agency_name, broker.city, broker.license_number, broker.bio,
    broker.service_areas?.length, broker.specialties?.length, broker.languages?.length,
    broker.years_experience, broker.style,
  ] : [];
  const completionPct = broker ? Math.round((completionFields.filter(Boolean).length / completionFields.length) * 100) : 0;

  const stats = [
    { label: "Leads reçus", value: leads?.length ?? 0, icon: Users, color: "text-primary" },
    { label: "Score AIPP", value: scores?.ranking_score?.toFixed(0) ?? "—", icon: TrendingUp, color: "text-primary" },
    { label: "Taux conversion", value: scores?.conversion_rate ? `${(scores.conversion_rate * 100).toFixed(0)}%` : "—", icon: BarChart3, color: "text-primary" },
    { label: "Note moyenne", value: scores?.avg_review_score?.toFixed(1) ?? "—", icon: Star, color: "text-amber-500" },
  ];

  return (
    <MainLayout>
      <Helmet><title>Tableau de bord courtier | UNPRO</title></Helmet>
      <div className="max-w-5xl mx-auto px-5 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {broker?.agency_name || "Mon tableau de bord"}
            </h1>
            <p className="text-sm text-muted-foreground">Bienvenue sur votre espace courtier</p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/broker/profile">Modifier le profil</Link>
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {stats.map((s) => (
            <Card key={s.label}>
              <CardContent className="p-4 flex items-center gap-3">
                <s.icon className={`h-8 w-8 ${s.color} shrink-0`} />
                <div>
                  <p className="text-2xl font-bold text-foreground">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Profile Completion */}
          <Card>
            <CardHeader><CardTitle className="text-base">Profil</CardTitle></CardHeader>
            <CardContent>
              <Progress value={completionPct} className="h-2 mb-2" />
              <p className="text-sm text-muted-foreground">{completionPct}% complété</p>
              {completionPct < 100 && (
                <Button asChild size="sm" variant="outline" className="mt-3 w-full">
                  <Link to="/broker/profile">Compléter <ArrowRight className="h-3 w-3 ml-1" /></Link>
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Zones */}
          <Card>
            <CardHeader><CardTitle className="text-base">Mes zones</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1.5">
                {broker?.service_areas?.map((z: string) => (
                  <Badge key={z} variant="secondary" className="text-xs">
                    <MapPin className="h-2.5 w-2.5 mr-0.5" /> {z}
                  </Badge>
                )) || <p className="text-sm text-muted-foreground">Aucune zone configurée</p>}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader><CardTitle className="text-base">Actions rapides</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <Button asChild variant="outline" size="sm" className="w-full justify-start">
                <Link to="/broker/leads"><Users className="h-3.5 w-3.5 mr-2" /> Voir mes leads</Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="w-full justify-start">
                <Link to="/broker/appointments"><Calendar className="h-3.5 w-3.5 mr-2" /> Rendez-vous</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Recent Leads */}
        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Leads récents</CardTitle>
              <Button asChild variant="ghost" size="sm">
                <Link to="/broker/leads">Voir tout <ArrowRight className="h-3 w-3 ml-1" /></Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {!leads?.length ? (
              <p className="text-sm text-muted-foreground text-center py-8">Aucun lead pour l'instant. Ils arrivent bientôt!</p>
            ) : (
              <div className="space-y-3">
                {leads.slice(0, 5).map((m: any) => (
                  <div key={m.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="text-sm font-medium text-foreground">{m.leads?.intent || "Lead"}</p>
                      <p className="text-xs text-muted-foreground">{m.leads?.city} • Score: {m.score}</p>
                    </div>
                    <Badge variant={m.status === "suggested" ? "secondary" : "default"}>
                      {m.status === "suggested" ? "Nouveau" : m.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
