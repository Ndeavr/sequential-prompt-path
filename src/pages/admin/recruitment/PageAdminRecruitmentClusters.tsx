import { useRecruitmentClusters } from "@/hooks/useRecruitmentClusters";
import AdminLayout from "@/layouts/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Layers } from "lucide-react";

export default function PageAdminRecruitmentClusters() {
  const { clusters, categories, capacityTargets, stopRules } = useRecruitmentClusters();

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Clusters géographiques</h1>
          <p className="text-sm text-muted-foreground">Gestion des territoires et capacités de recrutement</p>
        </div>

        {clusters.isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-60 rounded-lg" />)}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {clusters.data?.map((cluster) => {
              const clusterTargets = capacityTargets.data?.filter((t) => t.cluster_id === cluster.id) || [];
              const clusterRules = stopRules.data?.filter((r) => r.cluster_id === cluster.id) || [];
              const cities = (cluster.city_list_json as string[]) || [];

              return (
                <Card key={cluster.id} className="bg-card/80 backdrop-blur border-border/50">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-primary" />
                        {cluster.name}
                      </CardTitle>
                      <Badge variant={cluster.is_active ? "default" : "secondary"}>
                        {cluster.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{cluster.region_name} • {cluster.province_code}</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Cities */}
                    <div className="flex flex-wrap gap-1">
                      {cities.slice(0, 4).map((c) => (
                        <Badge key={c} variant="outline" className="text-xs">{c}</Badge>
                      ))}
                      {cities.length > 4 && <Badge variant="outline" className="text-xs">+{cities.length - 4}</Badge>}
                    </div>

                    {/* Capacity per category */}
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                        <Layers className="h-3 w-3" /> Capacités
                      </p>
                      {clusterTargets.map((t) => {
                        const fill = Number(t.fill_ratio_cached) * 100;
                        const isFull = t.recruitment_status === "full";
                        return (
                          <div key={t.id} className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="capitalize">{t.category_slug} ({t.season_code})</span>
                              <span>{t.target_slots_paid}/{t.target_slots_total} {isFull && "✅"}</span>
                            </div>
                            <Progress value={fill} className={`h-1.5 ${isFull ? "[&>div]:bg-green-500" : ""}`} />
                          </div>
                        );
                      })}
                      {clusterTargets.length === 0 && (
                        <p className="text-xs text-muted-foreground italic">Aucune capacité configurée</p>
                      )}
                    </div>

                    {/* Stop rules */}
                    {clusterRules.length > 0 && (
                      <div className="text-xs text-muted-foreground">
                        {clusterRules.filter((r) => r.triggered_at).length} stop rule(s) déclenchée(s)
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
