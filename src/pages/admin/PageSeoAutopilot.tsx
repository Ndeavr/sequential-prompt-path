import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Rocket, RefreshCw, Calendar, Zap, BarChart3, Target, Shield, Brain, TrendingUp, Play } from "lucide-react";

interface QueueStats {
  queue: { queued: number; generating: number; published: number; failed: number };
  today: any[];
  topPerformers: any[];
  refreshCandidates: any[];
  aeoReadiness: { with_answer_block: number; with_faq: number; with_schema: number; total_published: number };
  typeBreakdown: Record<string, Record<string, number>>;
}

export default function PageSeoAutopilot() {
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("seo-generator", { body: { action: "queue_stats" } });
      if (error) throw error;
      setStats(data);
    } catch (e: any) {
      toast.error("Erreur chargement stats: " + (e.message || ""));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStats(); }, []);

  const handleAction = async (action: string, extra?: any) => {
    setActionLoading(action);
    try {
      const { data, error } = await supabase.functions.invoke("seo-generator", { body: { action, ...extra } });
      if (error) throw error;
      toast.success(`${action}: ${JSON.stringify(data).slice(0, 100)}`);
      fetchStats();
    } catch (e: any) {
      toast.error(e.message || "Erreur");
    } finally {
      setActionLoading(null);
    }
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "queued": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "generating": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "published": return "bg-green-500/20 text-green-400 border-green-500/30";
      case "failed": return "bg-red-500/20 text-red-400 border-red-500/30";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const typeIcon = (t: string) => {
    switch (t) {
      case "city_service": return <Target className="h-3 w-3" />;
      case "problem": return <Shield className="h-3 w-3" />;
      case "price": return <TrendingUp className="h-3 w-3" />;
      case "aeo": return <Brain className="h-3 w-3" />;
      case "geo": return <Zap className="h-3 w-3" />;
      default: return <BarChart3 className="h-3 w-3" />;
    }
  };

  if (loading && !stats) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const q = stats?.queue || { queued: 0, generating: 0, published: 0, failed: 0 };
  const total = q.queued + q.generating + q.published + q.failed;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Rocket className="h-6 w-6 text-primary" />
            SEO Autopilot Command Center
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{total} pages dans le pipeline · AEO + GEO Engine</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchStats} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button size="sm" onClick={() => handleAction("auto_publish")} disabled={!!actionLoading}
            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700">
            <Play className="h-4 w-4 mr-1" /> Publier maintenant
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "En file", value: q.queued, color: "from-blue-500/10 to-blue-600/5 border-blue-500/20", textColor: "text-blue-400" },
          { label: "En génération", value: q.generating, color: "from-yellow-500/10 to-yellow-600/5 border-yellow-500/20", textColor: "text-yellow-400" },
          { label: "Publiées", value: q.published, color: "from-green-500/10 to-green-600/5 border-green-500/20", textColor: "text-green-400" },
          { label: "Échouées", value: q.failed, color: "from-red-500/10 to-red-600/5 border-red-500/20", textColor: "text-red-400" },
        ].map(kpi => (
          <Card key={kpi.label} className={`bg-gradient-to-br ${kpi.color} border backdrop-blur-sm`}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">{kpi.label}</p>
              <p className={`text-3xl font-bold ${kpi.textColor} mt-1`}>{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* AEO Readiness */}
      {stats?.aeoReadiness && (
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Brain className="h-4 w-4 text-primary" /> AEO / GEO Readiness</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Quick Answer</span>
                <p className="text-lg font-semibold text-foreground">{stats.aeoReadiness.with_answer_block}/{stats.aeoReadiness.total_published}</p>
              </div>
              <div>
                <span className="text-muted-foreground">FAQ Schema</span>
                <p className="text-lg font-semibold text-foreground">{stats.aeoReadiness.with_faq}/{stats.aeoReadiness.total_published}</p>
              </div>
              <div>
                <span className="text-muted-foreground">JSON-LD</span>
                <p className="text-lg font-semibold text-foreground">{stats.aeoReadiness.with_schema}/{stats.aeoReadiness.total_published}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Total publiées</span>
                <p className="text-lg font-semibold text-green-400">{stats.aeoReadiness.total_published}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="today" className="space-y-4">
        <TabsList className="bg-muted/50 backdrop-blur-sm">
          <TabsTrigger value="today"><Calendar className="h-3 w-3 mr-1" /> Aujourd'hui</TabsTrigger>
          <TabsTrigger value="top"><TrendingUp className="h-3 w-3 mr-1" /> Top</TabsTrigger>
          <TabsTrigger value="refresh"><RefreshCw className="h-3 w-3 mr-1" /> Refresh</TabsTrigger>
          <TabsTrigger value="types"><BarChart3 className="h-3 w-3 mr-1" /> Types</TabsTrigger>
        </TabsList>

        <TabsContent value="today">
          <Card className="border-border/50 backdrop-blur-sm">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Pages prévues aujourd'hui</CardTitle>
              <Button size="sm" variant="outline" onClick={() => handleAction("generate_money_page")} disabled={!!actionLoading}>
                <Zap className="h-3 w-3 mr-1" /> Générer prochaine
              </Button>
            </CardHeader>
            <CardContent>
              {(stats?.today || []).length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Aucune page prévue aujourd'hui</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Slug</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Priorité</TableHead>
                      <TableHead>Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(stats?.today || []).map((p: any) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-mono text-xs">{p.slug}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs flex items-center gap-1 w-fit">{typeIcon(p.page_type)} {p.page_type}</Badge></TableCell>
                        <TableCell>{p.priority_score}</TableCell>
                        <TableCell><Badge className={`text-xs ${statusColor(p.status)}`}>{p.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="top">
          <Card className="border-border/50 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Top Performers</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Slug</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Clicks</TableHead>
                    <TableHead>Impressions</TableHead>
                    <TableHead>Leads</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(stats?.topPerformers || []).map((p: any, i: number) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono text-xs">{p.slug}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{p.page_type}</Badge></TableCell>
                      <TableCell>{p.clicks}</TableCell>
                      <TableCell>{p.impressions}</TableCell>
                      <TableCell>{p.leads}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="refresh">
          <Card className="border-border/50 backdrop-blur-sm">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Candidats au refresh</CardTitle>
              <Button size="sm" variant="outline" onClick={() => handleAction("refresh_low_performers")} disabled={!!actionLoading}>
                <RefreshCw className="h-3 w-3 mr-1" /> Refresh bas performers
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Slug</TableHead>
                    <TableHead>Clicks</TableHead>
                    <TableHead>Impressions</TableHead>
                    <TableHead>Dernière MàJ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(stats?.refreshCandidates || []).map((p: any, i: number) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono text-xs">{p.slug}</TableCell>
                      <TableCell>{p.clicks}</TableCell>
                      <TableCell>{p.impressions}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{p.updated_at?.split("T")[0]}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="types">
          <Card className="border-border/50 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Breakdown par type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(stats?.typeBreakdown || {}).map(([type, statuses]) => (
                  <div key={type} className="flex items-center gap-3">
                    <Badge variant="outline" className="min-w-[100px] justify-center flex items-center gap-1">{typeIcon(type)} {type}</Badge>
                    <div className="flex gap-2 flex-wrap">
                      {Object.entries(statuses as Record<string, number>).map(([status, count]) => (
                        <Badge key={status} className={`text-xs ${statusColor(status)}`}>{status}: {count}</Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Actions rapides */}
      <Card className="border-border/50 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Actions rapides</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => handleAction("generate_money_page")} disabled={!!actionLoading}>
            <Zap className="h-3 w-3 mr-1" /> Générer 1 page
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleAction("auto_publish", { max: 5 })} disabled={!!actionLoading}>
            <Play className="h-3 w-3 mr-1" /> Auto-publish (max 5)
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleAction("refresh_low_performers", { max: 3 })} disabled={!!actionLoading}>
            <RefreshCw className="h-3 w-3 mr-1" /> Refresh 3 pages
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
