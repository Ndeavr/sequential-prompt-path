/**
 * UNPRO — Admin Lead Pipe Empire Dashboard
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Droplets, Eye, LogIn, Wrench, Activity } from "lucide-react";

export default function PageLeadEmpireDashboard() {
  const { data: cityRollup } = useQuery({
    queryKey: ["lead-empire-city-rollup"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("lead_pipe_page_views") as any)
        .select("city_slug, event")
        .gte("created_at", new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString());
      if (error) throw error;
      const map = new Map<string, { views: number; logins: number; plumbers: number }>();
      for (const row of data ?? []) {
        const m = map.get(row.city_slug) ?? { views: 0, logins: 0, plumbers: 0 };
        if (row.event === "view") m.views++;
        if (row.event === "click_login") m.logins++;
        if (row.event === "click_plumber") m.plumbers++;
        map.set(row.city_slug, m);
      }
      return Array.from(map.entries())
        .map(([city_slug, v]) => ({ city_slug, ...v }))
        .sort((a, b) => b.views - a.views)
        .slice(0, 20);
    },
  });

  const { data: totals } = useQuery({
    queryKey: ["lead-empire-totals"],
    queryFn: async () => {
      const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
      const [views, logins, plumbers, scores, leads] = await Promise.all([
        (supabase.from("lead_pipe_page_views") as any).select("id", { count: "exact", head: true }).gte("created_at", since).eq("event", "view"),
        (supabase.from("lead_pipe_page_views") as any).select("id", { count: "exact", head: true }).gte("created_at", since).eq("event", "click_login"),
        (supabase.from("lead_pipe_page_views") as any).select("id", { count: "exact", head: true }).gte("created_at", since).eq("event", "click_plumber"),
        (supabase.from("property_lead_scores") as any).select("id", { count: "exact", head: true }).gte("created_at", since),
        (supabase.from("plumber_leads") as any).select("id", { count: "exact", head: true }).gte("created_at", since),
      ]);
      return {
        views: views.count ?? 0,
        logins: logins.count ?? 0,
        plumbers: plumbers.count ?? 0,
        scores: scores.count ?? 0,
        leads: leads.count ?? 0,
      };
    },
  });

  const ctr = totals?.views ? Math.round((totals.logins / totals.views) * 1000) / 10 : 0;

  return (
    <div className="min-h-screen p-6 bg-background">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Droplets className="size-7 text-blue-500" />
          <h1 className="text-2xl font-bold">Lead Pipe Empire — 30 derniers jours</h1>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><Eye className="size-3" /> Visites</div>
            <div className="text-2xl font-bold mt-1">{totals?.views ?? 0}</div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><LogIn className="size-3" /> Logins</div>
            <div className="text-2xl font-bold mt-1">{totals?.logins ?? 0}</div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><Activity className="size-3" /> Analyses</div>
            <div className="text-2xl font-bold mt-1">{totals?.scores ?? 0}</div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><Wrench className="size-3" /> Leads</div>
            <div className="text-2xl font-bold mt-1">{totals?.leads ?? 0}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">CTR Login</div>
            <div className="text-2xl font-bold mt-1">{ctr}%</div>
          </Card>
        </div>

        <Card className="p-5">
          <h2 className="text-lg font-bold mb-3">Top villes</h2>
          <div className="space-y-1">
            <div className="grid grid-cols-4 text-xs font-semibold text-muted-foreground border-b pb-2">
              <span>Ville</span><span>Vues</span><span>Logins</span><span>Plombiers</span>
            </div>
            {cityRollup?.map((c) => (
              <div key={c.city_slug} className="grid grid-cols-4 text-sm py-2 border-b last:border-0">
                <span className="font-medium">{c.city_slug}</span>
                <span>{c.views}</span>
                <span>{c.logins}</span>
                <span>{c.plumbers}</span>
              </div>
            )) ?? <div className="text-sm text-muted-foreground py-4">Aucune donnée encore.</div>}
          </div>
        </Card>
      </div>
    </div>
  );
}
