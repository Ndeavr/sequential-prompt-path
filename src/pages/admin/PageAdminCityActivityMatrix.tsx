/**
 * UNPRO — City × Activity Matrix Dashboard
 * Visual matrix of all generation targets with priority scoring and scraping launcher.
 */
import { useState } from "react";
import AdminLayout from "@/layouts/AdminLayout";
import { PageHeader, StatCard, LoadingState, EmptyState } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  MapPin, Grid3X3, Target, Rocket, RefreshCw, Users, TrendingUp,
  Zap, Activity, Building2, CheckCircle2, Clock, BarChart3,
} from "lucide-react";

/* ─── Hooks ─── */
const useClusters = () =>
  useQuery({
    queryKey: ["city-clusters"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cities_quebec_clusters")
        .select("*")
        .order("population_total", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

const useActivities = () =>
  useQuery({
    queryKey: ["activities-primary"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activities_primary")
        .select("*")
        .eq("status", "active")
        .order("urgency_level", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

const useTargets = () =>
  useQuery({
    queryKey: ["generation-targets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contractor_generation_targets")
        .select("*, cities_quebec_clusters(cluster_name), activities_primary(name, avg_job_value, urgency_level)")
        .order("priority_score", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

const useTargetStats = () =>
  useQuery({
    queryKey: ["generation-targets-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contractor_generation_targets")
        .select("priority_score, status, estimated_contractors, generated_count, scraped_count");
      if (error) throw error;
      const total = data?.length ?? 0;
      const pending = data?.filter((t: any) => t.status === "pending").length ?? 0;
      const active = data?.filter((t: any) => t.status === "active").length ?? 0;
      const avgPriority = total ? Math.round(data!.reduce((s: number, t: any) => s + (t.priority_score || 0), 0) / total) : 0;
      const totalEstimated = data?.reduce((s: number, t: any) => s + (t.estimated_contractors || 0), 0) ?? 0;
      const totalScraped = data?.reduce((s: number, t: any) => s + (t.scraped_count || 0), 0) ?? 0;
      return { total, pending, active, avgPriority, totalEstimated, totalScraped };
    },
  });

/* ─── Priority helpers ─── */
const getPriorityColor = (score: number) => {
  if (score >= 70) return "bg-red-500/20 text-red-400 border-red-500/30";
  if (score >= 55) return "bg-amber-500/15 text-amber-400 border-amber-500/20";
  if (score >= 40) return "bg-emerald-500/15 text-emerald-400 border-emerald-500/20";
  return "bg-muted/40 text-muted-foreground border-border/30";
};

const getCellBg = (score: number) => {
  if (score >= 70) return "bg-red-500/15 hover:bg-red-500/25";
  if (score >= 55) return "bg-amber-500/10 hover:bg-amber-500/20";
  if (score >= 40) return "bg-emerald-500/8 hover:bg-emerald-500/15";
  return "bg-muted/20 hover:bg-muted/30";
};

/* ─── Page ─── */
const PageAdminCityActivityMatrix = () => {
  const queryClient = useQueryClient();
  const { data: clusters, isLoading: clustersLoading } = useClusters();
  const { data: activities, isLoading: activitiesLoading } = useActivities();
  const { data: targets } = useTargets();
  const { data: stats } = useTargetStats();
  const [selectedCluster, setSelectedCluster] = useState<string | null>(null);

  const generateMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("fn-generate-matrix-targets");
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      toast.success(`${data?.targets_generated ?? 0} cibles générées !`);
      queryClient.invalidateQueries({ queryKey: ["generation-targets"] });
      queryClient.invalidateQueries({ queryKey: ["generation-targets-stats"] });
    },
    onError: (e) => toast.error("Erreur: " + e.message),
  });

  const launchScrapingMutation = useMutation({
    mutationFn: async (clusterId: string) => {
      const cluster = clusters?.find((c: any) => c.id === clusterId);
      if (!cluster) throw new Error("Cluster not found");
      const cities = (cluster.cities_json || []) as string[];

      // Get all primary activities for this cluster's targets
      const clusterTargets = (targets || []).filter((t: any) => t.city_cluster_id === clusterId);
      const activityNames = [...new Set(clusterTargets.map((t: any) => t.activities_primary?.name).filter(Boolean))];

      // Launch one prospection job per activity
      const results = [];
      for (const actName of activityNames.slice(0, 5)) {
        const { data, error } = await supabase.functions.invoke("fn-start-prospection-job", {
          body: {
            job_name: `[MATRIX] ${actName} — ${cluster.cluster_name}`,
            target_category: actName,
            target_cities: cities.slice(0, 5),
            radius_km: 25,
            languages: ["fr"],
          },
        });
        if (error) console.error(`Scraping failed for ${actName}:`, error);
        else results.push(data);
      }
      return results;
    },
    onSuccess: (results) => {
      toast.success(`${results.length} jobs de scraping lancés !`);
      queryClient.invalidateQueries({ queryKey: ["prospection-engine-jobs"] });
    },
    onError: (e) => toast.error("Erreur scraping: " + e.message),
  });

  const isLoading = clustersLoading || activitiesLoading;
  if (isLoading) return <AdminLayout><LoadingState /></AdminLayout>;

  // Build matrix lookup: clusterID_activityID -> target
  const matrixMap = new Map<string, any>();
  (targets || []).forEach((t: any) => {
    matrixMap.set(`${t.city_cluster_id}_${t.primary_activity_id}`, t);
  });

  return (
    <AdminLayout>
      <PageHeader
        title="Matrice Ville × Activité"
        description="Génération matricielle de cibles pour scraping et acquisition"
        badge="MATRIX"
        action={
          <Button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${generateMutation.isPending ? "animate-spin" : ""}`} />
            {generateMutation.isPending ? "Génération…" : "Générer matrice"}
          </Button>
        }
      />

      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <StatCard title="Cibles" value={stats?.total ?? 0} icon={<Target className="h-4 w-4" />} />
        <StatCard title="En attente" value={stats?.pending ?? 0} icon={<Clock className="h-4 w-4" />} />
        <StatCard title="Score moyen" value={stats?.avgPriority ?? 0} icon={<TrendingUp className="h-4 w-4" />} />
        <StatCard title="Entrepreneurs est." value={stats?.totalEstimated?.toLocaleString() ?? 0} icon={<Users className="h-4 w-4" />} />
        <StatCard title="Scrapés" value={stats?.totalScraped ?? 0} icon={<CheckCircle2 className="h-4 w-4" />} />
        <StatCard title="Clusters" value={clusters?.length ?? 0} icon={<MapPin className="h-4 w-4" />} />
      </div>

      <Tabs defaultValue="matrix" className="space-y-4">
        <TabsList>
          <TabsTrigger value="matrix" className="gap-1.5"><Grid3X3 className="h-3.5 w-3.5" />Matrice</TabsTrigger>
          <TabsTrigger value="clusters" className="gap-1.5"><MapPin className="h-3.5 w-3.5" />Clusters</TabsTrigger>
          <TabsTrigger value="top" className="gap-1.5"><Zap className="h-3.5 w-3.5" />Top priorités</TabsTrigger>
        </TabsList>

        {/* ── Matrix Tab ── */}
        <TabsContent value="matrix">
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left p-2 font-medium text-muted-foreground sticky left-0 bg-card z-10 min-w-[120px]">
                      Cluster
                    </th>
                    {(activities || []).map((a: any) => (
                      <th key={a.id} className="text-center p-2 font-medium text-muted-foreground min-w-[70px]">
                        <div className="truncate max-w-[70px]" title={a.name}>
                          {a.name.split(" ")[0]}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(clusters || []).map((cluster: any) => (
                    <tr key={cluster.id} className="border-b border-border/20">
                      <td className="p-2 font-medium sticky left-0 bg-card z-10">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3 w-3 text-primary shrink-0" />
                          <span className="truncate">{cluster.cluster_name}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          {(cluster.population_total / 1000).toFixed(0)}k hab
                        </span>
                      </td>
                      {(activities || []).map((a: any) => {
                        const target = matrixMap.get(`${cluster.id}_${a.id}`);
                        const score = target?.priority_score ?? 0;
                        return (
                          <td
                            key={a.id}
                            className={`p-1 text-center cursor-pointer transition-colors ${getCellBg(score)}`}
                            title={`${cluster.cluster_name} × ${a.name}\nScore: ${score}\nEst: ${target?.estimated_contractors ?? "?"}`}
                          >
                            <span className="font-mono font-bold text-[11px]">{score || "—"}</span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-500/20" /> ≥70 Priorité haute</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-500/15" /> ≥55 Moyenne</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-500/10" /> ≥40 Basse</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-muted/30" /> &lt;40 Faible</span>
          </div>
        </TabsContent>

        {/* ── Clusters Tab ── */}
        <TabsContent value="clusters" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(clusters || []).map((cluster: any) => {
              const cities = (cluster.cities_json || []) as string[];
              const clusterTargets = (targets || []).filter((t: any) => t.city_cluster_id === cluster.id);
              const avgScore = clusterTargets.length
                ? Math.round(clusterTargets.reduce((s: number, t: any) => s + (t.priority_score || 0), 0) / clusterTargets.length)
                : 0;
              const totalEst = clusterTargets.reduce((s: number, t: any) => s + (t.estimated_contractors || 0), 0);

              return (
                <Card key={cluster.id} className="border-border/30">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-bold flex items-center gap-1.5">
                          <MapPin className="h-4 w-4 text-primary" />
                          {cluster.cluster_name}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {(cluster.population_total / 1000).toFixed(0)}k hab · Densité {cluster.density_score}/100
                        </p>
                      </div>
                      <Badge className={`text-xs border-0 ${getPriorityColor(avgScore)}`}>
                        P{avgScore}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {cities.slice(0, 5).map((c: string) => (
                        <span key={c} className="px-1.5 py-0.5 rounded bg-muted/50 text-[10px]">{c}</span>
                      ))}
                      {cities.length > 5 && <span className="text-[10px] text-muted-foreground">+{cities.length - 5}</span>}
                    </div>

                    <div className="flex items-center justify-between text-xs border-t border-border/20 pt-2">
                      <span>{clusterTargets.length} cibles · {totalEst.toLocaleString()} entrepreneurs est.</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs gap-1"
                        onClick={() => launchScrapingMutation.mutate(cluster.id)}
                        disabled={launchScrapingMutation.isPending}
                      >
                        <Rocket className="h-3 w-3" />
                        Scraper
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* ── Top Priorities Tab ── */}
        <TabsContent value="top">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                Top 30 cibles prioritaires
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left p-3 font-medium text-muted-foreground">#</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Cluster</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Activité</th>
                    <th className="text-center p-3 font-medium text-muted-foreground">Score</th>
                    <th className="text-center p-3 font-medium text-muted-foreground">Est.</th>
                    <th className="text-center p-3 font-medium text-muted-foreground">Valeur moy.</th>
                    <th className="text-center p-3 font-medium text-muted-foreground">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {(targets || []).slice(0, 30).map((t: any, i: number) => (
                    <tr key={t.id} className="border-b border-border/20 hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-mono text-muted-foreground">{i + 1}</td>
                      <td className="p-3">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-primary" />
                          {t.cities_quebec_clusters?.cluster_name ?? "—"}
                        </span>
                      </td>
                      <td className="p-3 font-medium">{t.activities_primary?.name ?? "—"}</td>
                      <td className="p-3 text-center">
                        <Badge className={`text-xs border-0 font-mono ${getPriorityColor(t.priority_score)}`}>
                          {t.priority_score}
                        </Badge>
                      </td>
                      <td className="p-3 text-center font-mono">{t.estimated_contractors}</td>
                      <td className="p-3 text-center font-mono text-muted-foreground">
                        {t.activities_primary?.avg_job_value ? `${(t.activities_primary.avg_job_value / 1000).toFixed(0)}k$` : "—"}
                      </td>
                      <td className="p-3 text-center">
                        <Badge variant="outline" className="text-xs">
                          {t.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
};

export default PageAdminCityActivityMatrix;
