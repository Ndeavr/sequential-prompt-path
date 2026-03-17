/**
 * UNPRO — Admin Local SEO Dashboard
 * Route: /admin/local-seo
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Globe, FileText, AlertTriangle, BarChart3, Clock,
  CheckCircle, Filter,
} from "lucide-react";

export default function AdminLocalSeo() {
  const [cityFilter, setCityFilter] = useState<string>("all");

  const { data: pages = [] } = useQuery({
    queryKey: ["admin-local-seo-pages", cityFilter],
    queryFn: async () => {
      let q = supabase.from("seo_local_pages").select("*").order("created_at", { ascending: false }).limit(200);
      if (cityFilter !== "all") q = q.ilike("city", cityFilter);
      const { data } = await q;
      return data || [];
    },
  });

  const { data: logs = [] } = useQuery({
    queryKey: ["admin-local-seo-logs"],
    queryFn: async () => {
      const { data } = await supabase.from("seo_local_generation_logs").select("*").order("created_at", { ascending: false }).limit(20);
      return data || [];
    },
  });

  const { data: queue = [] } = useQuery({
    queryKey: ["admin-seo-queue"],
    queryFn: async () => {
      const { data } = await supabase.from("seo_admin_queue").select("*").eq("status", "pending").order("created_at", { ascending: false }).limit(50);
      return data || [];
    },
  });

  const published = pages.filter(p => p.published);
  const cities = [...new Set(pages.map(p => p.city))];
  const categories = [...new Set(pages.map(p => p.service_category).filter(Boolean))];

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Globe className="h-6 w-6 text-primary" />
            SEO Local Engine
          </h1>
          <p className="text-muted-foreground text-sm">Pages programmatiques Laval, Terrebonne et plus</p>
        </div>
        <div className="flex gap-2">
          <select
            value={cityFilter}
            onChange={e => setCityFilter(e.target.value)}
            className="rounded-md border bg-background px-3 py-1.5 text-sm"
          >
            <option value="all">Toutes les villes</option>
            {cities.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KPI icon={<FileText className="h-4 w-4" />} label="Pages totales" value={pages.length} />
        <KPI icon={<CheckCircle className="h-4 w-4 text-emerald-400" />} label="Publiées" value={published.length} />
        <KPI icon={<Globe className="h-4 w-4 text-blue-400" />} label="Villes" value={cities.length} />
        <KPI icon={<BarChart3 className="h-4 w-4 text-primary" />} label="Catégories" value={categories.length} />
        <KPI icon={<AlertTriangle className="h-4 w-4 text-amber-400" />} label="File admin" value={queue.length} />
      </div>

      <Tabs defaultValue="pages">
        <TabsList>
          <TabsTrigger value="pages">Pages ({pages.length})</TabsTrigger>
          <TabsTrigger value="queue">File admin ({queue.length})</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="pages" className="space-y-3 mt-4">
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3">Slug</th>
                  <th className="text-left p-3">Ville</th>
                  <th className="text-left p-3">Catégorie</th>
                  <th className="text-center p-3">Urgence</th>
                  <th className="text-center p-3">SEO</th>
                  <th className="text-center p-3">Intent</th>
                  <th className="text-center p-3">Conv.</th>
                  <th className="text-center p-3">Publié</th>
                </tr>
              </thead>
              <tbody>
                {pages.map(p => (
                  <tr key={p.id} className="border-t hover:bg-muted/30">
                    <td className="p-3 font-mono text-xs">{p.slug}</td>
                    <td className="p-3">{p.city}</td>
                    <td className="p-3">{p.service_category}</td>
                    <td className="p-3 text-center">
                      <Badge variant="outline" className={
                        p.urgency === "high" ? "text-red-400" :
                        p.urgency === "medium" ? "text-amber-400" : "text-emerald-400"
                      }>{p.urgency}</Badge>
                    </td>
                    <td className="p-3 text-center font-mono">{p.seo_score}</td>
                    <td className="p-3 text-center font-mono">{p.intent_score}</td>
                    <td className="p-3 text-center font-mono">{p.conversion_score}</td>
                    <td className="p-3 text-center">{p.published ? "✅" : "❌"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="queue" className="space-y-3 mt-4">
          {queue.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Aucun item en attente</p>
          ) : (
            queue.map(q => (
              <Card key={q.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <Badge variant="outline">{q.type}</Badge>
                    <span className="ml-2 text-sm text-foreground">{q.slug} — {q.city}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{new Date(q.created_at).toLocaleDateString("fr-CA")}</span>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="logs" className="space-y-3 mt-4">
          {logs.map(l => (
            <Card key={l.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge variant={l.status === "completed" ? "default" : "outline"}>{l.status}</Badge>
                  <span className="font-medium text-foreground">{l.batch_name}</span>
                  <span className="text-sm text-muted-foreground">{l.city} — {l.total_pages} pages</span>
                </div>
                <span className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleDateString("fr-CA")}</span>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function KPI({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        {icon}
        <div>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
