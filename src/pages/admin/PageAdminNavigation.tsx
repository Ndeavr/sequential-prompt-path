/**
 * UNPRO — Admin Navigation Health Dashboard
 * Shows broken links, fallback conversions, route health heatmap.
 */
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import MainLayout from "@/layouts/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertTriangle, CheckCircle, ExternalLink, TrendingUp } from "lucide-react";

interface BrokenLinkEvent {
  id: string;
  attempted_path: string;
  resolved_path: string | null;
  user_role: string | null;
  resolution_type: string;
  was_google_entry: boolean;
  created_at: string;
  referrer: string | null;
}

export default function PageAdminNavigation() {
  const [events, setEvents] = useState<BrokenLinkEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, google: 0, resolved: 0, unique: 0 });

  const fetchEvents = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("broken_link_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    const items = (data || []) as BrokenLinkEvent[];
    setEvents(items);

    const uniquePaths = new Set(items.map((e) => e.attempted_path));
    setStats({
      total: items.length,
      google: items.filter((e) => e.was_google_entry).length,
      resolved: items.filter((e) => e.resolved_path).length,
      unique: uniquePaths.size,
    });
    setLoading(false);
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  // Group by path for heatmap
  const pathCounts = events.reduce<Record<string, number>>((acc, e) => {
    acc[e.attempted_path] = (acc[e.attempted_path] || 0) + 1;
    return acc;
  }, {});

  const topPaths = Object.entries(pathCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 15);

  return (
    <MainLayout>
      <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Santé de la navigation</h1>
            <p className="text-sm text-muted-foreground mt-1">Liens cassés, fallbacks, trafic Google récupéré</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchEvents} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Actualiser
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Événements totaux", value: stats.total, icon: AlertTriangle },
            { label: "Entrées Google", value: stats.google, icon: ExternalLink },
            { label: "Résolutions", value: stats.resolved, icon: CheckCircle },
            { label: "URLs uniques", value: stats.unique, icon: TrendingUp },
          ].map((s) => (
            <Card key={s.label} className="bg-card/50 border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <s.icon className="h-4 w-4" />
                  <span className="text-xs">{s.label}</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Heatmap — Top broken paths */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="text-base">Top URLs non résolues</CardTitle>
          </CardHeader>
          <CardContent>
            {topPaths.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun lien cassé détecté. 🎉</p>
            ) : (
              <div className="space-y-2">
                {topPaths.map(([path, count]) => {
                  const maxCount = topPaths[0]?.[1] || 1;
                  const pct = (count / maxCount) * 100;
                  return (
                    <div key={path} className="flex items-center gap-3">
                      <code className="text-xs text-muted-foreground font-mono truncate flex-1 min-w-0">
                        {path}
                      </code>
                      <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <Badge variant="secondary" className="text-xs shrink-0">
                        {count}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent events */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="text-base">Événements récents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/50 text-muted-foreground">
                    <th className="text-left py-2 pr-3">URL tentée</th>
                    <th className="text-left py-2 pr-3">Résolution</th>
                    <th className="text-left py-2 pr-3">Rôle</th>
                    <th className="text-left py-2 pr-3">Google</th>
                    <th className="text-left py-2">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {events.slice(0, 30).map((e) => (
                    <tr key={e.id} className="border-b border-border/20">
                      <td className="py-2 pr-3 font-mono text-foreground truncate max-w-48">
                        {e.attempted_path}
                      </td>
                      <td className="py-2 pr-3 text-muted-foreground truncate max-w-36">
                        {e.resolved_path || "—"}
                      </td>
                      <td className="py-2 pr-3">
                        <Badge variant="outline" className="text-[10px]">
                          {e.user_role || "guest"}
                        </Badge>
                      </td>
                      <td className="py-2 pr-3">
                        {e.was_google_entry ? (
                          <Badge className="bg-primary/10 text-primary text-[10px]">Google</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-2 text-muted-foreground">
                        {new Date(e.created_at).toLocaleDateString("fr-CA")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {events.length === 0 && !loading && (
                <p className="text-sm text-muted-foreground text-center py-6">Aucun événement enregistré</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
