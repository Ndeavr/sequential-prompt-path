/**
 * UNPRO — Admin SEO Programmatic Generator
 * Bulk seed queue, trigger generation, publish pages, monitor stats.
 * Now includes mass generation engine (fn-seo-generate-pages).
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Globe, FileText, Zap, CheckCircle, AlertTriangle,
  Play, Upload, BarChart3, Loader2, Eye, Rocket,
} from "lucide-react";
import { Link } from "react-router-dom";

type Stats = {
  queue: { pending: number; processing: number; error: number };
  pages: { total: number; published: number; draft: number };
  cities: number;
  cityList: string[];
  typeBreakdown: Record<string, number>;
};

export default function AdminSeoGenerator() {
  const qc = useQueryClient();
  const [batchSize, setBatchSize] = useState(5);

  const { data: stats } = useQuery<Stats>({
    queryKey: ["seo-gen-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("seo-generator", {
        body: { action: "stats" },
      });
      if (error) throw error;
      return data;
    },
    refetchInterval: 10000,
  });

  const { data: recentPages = [] } = useQuery({
    queryKey: ["seo-recent-pages"],
    queryFn: async () => {
      const { data } = await supabase
        .from("seo_pages")
        .select("id, slug, title, city, profession, page_type, is_published, created_at, views, quality_score")
        .order("created_at", { ascending: false })
        .limit(50);
      return data || [];
    },
  });

  const { data: queueItems = [] } = useQuery({
    queryKey: ["seo-queue-items"],
    queryFn: async () => {
      const { data } = await supabase
        .from("seo_generation_queue")
        .select("*")
        .in("status", ["pending", "processing", "error"])
        .order("created_at", { ascending: false })
        .limit(50);
      return data || [];
    },
    refetchInterval: 5000,
  });

  const { data: genLogs = [] } = useQuery({
    queryKey: ["seo-gen-logs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("seo_generation_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
      return data || [];
    },
  });

  const bulkSeed = useMutation({
    mutationFn: async (types: string[]) => {
      const { data, error } = await supabase.functions.invoke("seo-generator", {
        body: { action: "bulk_seed", types },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`${data.seeded} pages ajoutées à la file`);
      qc.invalidateQueries({ queryKey: ["seo-gen-stats"] });
      qc.invalidateQueries({ queryKey: ["seo-queue-items"] });
    },
    onError: (e) => toast.error(`Erreur: ${e.message}`),
  });

  const generate = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("seo-generator", {
        body: { action: "generate", batchSize },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`${data.generated} pages générées`);
      qc.invalidateQueries({ queryKey: ["seo-gen-stats"] });
      qc.invalidateQueries({ queryKey: ["seo-recent-pages"] });
      qc.invalidateQueries({ queryKey: ["seo-queue-items"] });
    },
    onError: (e) => toast.error(`Erreur: ${e.message}`),
  });

  const publishAll = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("seo-generator", {
        body: { action: "publish", publishAll: true },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`${data.published} pages publiées`);
      qc.invalidateQueries({ queryKey: ["seo-gen-stats"] });
      qc.invalidateQueries({ queryKey: ["seo-recent-pages"] });
    },
    onError: (e) => toast.error(`Erreur: ${e.message}`),
  });

  // Mass generation engine
  const massGenerate = useMutation({
    mutationFn: async (mode: string) => {
      const { data, error } = await supabase.functions.invoke("fn-seo-generate-pages", {
        body: { mode },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`🚀 ${data.total_generated} pages générées en ${(data.generation_time_ms / 1000).toFixed(1)}s`);
      qc.invalidateQueries({ queryKey: ["seo-gen-stats"] });
      qc.invalidateQueries({ queryKey: ["seo-recent-pages"] });
      qc.invalidateQueries({ queryKey: ["seo-gen-logs"] });
    },
    onError: (e) => toast.error(`Erreur génération massive: ${e.message}`),
  });

  const q = stats?.queue;
  const p = stats?.pages;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Globe className="h-6 w-6 text-primary" />
            SEO Programmatique
          </h1>
          <p className="text-sm text-muted-foreground">Génération massive de pages ville × métier × problème</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4 lg:grid-cols-7">
        <KPI icon={<FileText className="h-4 w-4" />} label="Pages totales" value={p?.total ?? 0} />
        <KPI icon={<CheckCircle className="h-4 w-4 text-emerald-500" />} label="Publiées" value={p?.published ?? 0} />
        <KPI icon={<Eye className="h-4 w-4 text-blue-500" />} label="Brouillons" value={p?.draft ?? 0} />
        <KPI icon={<Globe className="h-4 w-4 text-primary" />} label="Villes" value={stats?.cities ?? 0} />
        <KPI icon={<Zap className="h-4 w-4 text-amber-500" />} label="File attente" value={q?.pending ?? 0} />
        <KPI icon={<Loader2 className="h-4 w-4 text-blue-400" />} label="En cours" value={q?.processing ?? 0} />
        <KPI icon={<AlertTriangle className="h-4 w-4 text-destructive" />} label="Erreurs" value={q?.error ?? 0} />
      </div>

      {/* Mass Generation Engine */}
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Rocket className="h-5 w-5 text-primary" />
            Moteur de génération massive
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Génère automatiquement toutes les combinaisons ville × métier et ville × problème avec contenu unique, FAQ, JSON-LD et maillage interne.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => massGenerate.mutate("all")}
              disabled={massGenerate.isPending}
              className="bg-primary"
            >
              {massGenerate.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Génération...</>
              ) : (
                <><Rocket className="h-4 w-4 mr-2" /> Générer TOUT (métiers + problèmes × villes)</>
              )}
            </Button>
            <Button
              onClick={() => massGenerate.mutate("profession_city")}
              disabled={massGenerate.isPending}
              variant="outline"
            >
              Métiers × Villes seulement
            </Button>
            <Button
              onClick={() => massGenerate.mutate("problem_city")}
              disabled={massGenerate.isPending}
              variant="outline"
            >
              Problèmes × Villes seulement
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Legacy Actions */}
      <Card>
        <CardHeader><CardTitle className="text-base">Actions (file d'attente)</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button
            onClick={() => bulkSeed.mutate(["profession_city", "problem_city"])}
            disabled={bulkSeed.isPending}
            variant="outline"
          >
            <Upload className="h-4 w-4 mr-2" />
            {bulkSeed.isPending ? "Seeding..." : "Seed file (métiers + problèmes × villes)"}
          </Button>

          <div className="flex items-center gap-2 border rounded-md px-3 py-1">
            <span className="text-sm text-muted-foreground">Batch:</span>
            <select
              value={batchSize}
              onChange={(e) => setBatchSize(Number(e.target.value))}
              className="bg-transparent text-sm"
            >
              {[1, 3, 5, 10, 15, 20].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          <Button
            onClick={() => generate.mutate()}
            disabled={generate.isPending || (q?.pending ?? 0) === 0}
          >
            <Play className="h-4 w-4 mr-2" />
            {generate.isPending ? "Génération..." : `Générer ${batchSize} pages`}
          </Button>

          <Button
            onClick={() => publishAll.mutate()}
            disabled={publishAll.isPending || (p?.draft ?? 0) === 0}
            variant="secondary"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            {publishAll.isPending ? "Publication..." : `Publier ${p?.draft ?? 0} brouillons`}
          </Button>
        </CardContent>
      </Card>

      {/* Type breakdown */}
      {stats?.typeBreakdown && Object.keys(stats.typeBreakdown).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(stats.typeBreakdown).map(([type, count]) => (
            <Badge key={type} variant="secondary">
              {type.replace("_", " ")}: {count}
            </Badge>
          ))}
        </div>
      )}

      <Tabs defaultValue="pages">
        <TabsList>
          <TabsTrigger value="pages">Pages ({recentPages.length})</TabsTrigger>
          <TabsTrigger value="queue">File ({queueItems.length})</TabsTrigger>
          <TabsTrigger value="logs">Historique ({genLogs.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pages" className="mt-4">
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3">Slug</th>
                  <th className="text-left p-3">Ville</th>
                  <th className="text-left p-3">Profession</th>
                  <th className="text-left p-3">Type</th>
                  <th className="text-center p-3">Score</th>
                  <th className="text-center p-3">Vues</th>
                  <th className="text-center p-3">Statut</th>
                  <th className="text-center p-3">Lien</th>
                </tr>
              </thead>
              <tbody>
                {recentPages.map((page: any) => (
                  <tr key={page.id} className="border-t hover:bg-muted/30">
                    <td className="p-3 font-mono text-xs max-w-[200px] truncate">{page.slug}</td>
                    <td className="p-3">{page.city || "—"}</td>
                    <td className="p-3">{page.profession || "—"}</td>
                    <td className="p-3">
                      <Badge variant="outline" className="text-xs">{page.page_type}</Badge>
                    </td>
                    <td className="p-3 text-center font-mono text-xs">
                      {page.quality_score ? (
                        <span className={page.quality_score >= 70 ? "text-emerald-500" : "text-amber-500"}>
                          {page.quality_score}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="p-3 text-center font-mono">{page.views || 0}</td>
                    <td className="p-3 text-center">
                      {page.is_published
                        ? <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Publié</Badge>
                        : <Badge variant="secondary">Brouillon</Badge>
                      }
                    </td>
                    <td className="p-3 text-center">
                      <Button asChild variant="ghost" size="sm">
                        <Link to={`/s/${page.slug}`} target="_blank">
                          <Eye className="h-3 w-3" />
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="queue" className="mt-4 space-y-2">
          {queueItems.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">File vide</p>
          ) : (
            queueItems.map((item: any) => (
              <Card key={item.id}>
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant={
                      item.status === "error" ? "destructive" :
                      item.status === "processing" ? "default" : "secondary"
                    }>
                      {item.status}
                    </Badge>
                    <span className="text-sm">
                      {item.profession || item.problem || "—"} • {item.city || "—"}
                    </span>
                  </div>
                  {item.error_message && (
                    <span className="text-xs text-destructive">{item.error_message}</span>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="logs" className="mt-4 space-y-2">
          {genLogs.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Aucun historique</p>
          ) : (
            genLogs.map((log: any) => {
              const meta = log.metadata as any;
              return (
                <Card key={log.id}>
                  <CardContent className="p-3 flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{log.generation_type}</Badge>
                      <span className="text-sm text-muted-foreground">
                        v{log.agent_version} • {log.generation_time_ms ? `${(log.generation_time_ms / 1000).toFixed(1)}s` : "—"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      {meta?.total && <span className="font-mono">{meta.total} pages</span>}
                      {meta?.errors > 0 && <span className="text-destructive font-mono">{meta.errors} erreurs</span>}
                      <span className="text-xs text-muted-foreground">
                        {new Date(log.created_at).toLocaleString("fr-CA")}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function KPI({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-3 flex items-center gap-2">
        {icon}
        <div>
          <p className="text-xl font-bold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
