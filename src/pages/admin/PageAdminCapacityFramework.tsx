/**
 * UNPRO — Admin · Contractor Capacity Framework
 * Trade × City capacity, saturation, exclusivity, CPC tiers.
 */
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, RefreshCw, Activity, MapPin, Lock, Wrench, Flame } from "lucide-react";
import { runCapacitySnapshot } from "@/services/capacity";
import { toast } from "sonner";

interface LiveRow {
  trade_slug: string; city_slug: string; final_cap: number; active_pros: number;
  saturation_score: number; band: string; cpc_tier: string | null; gap: number;
  cpc_cad: number | null; city_name: string | null; population: number | null;
}
interface RecoRow {
  trade_slug: string; city_slug: string; slot_class: string; status: string;
  remaining_slots: number; justification: string | null;
}

const MAJOR = ["montreal", "laval", "quebec", "gatineau", "sherbrooke", "trois-rivieres"];

const bandColor = (b: string) =>
  b === "red" ? "bg-red-500/15 text-red-400 border-red-500/30"
  : b === "yellow" ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
  : "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";

const tierColor = (t: string | null) =>
  t === "S" ? "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30"
  : t === "A" ? "bg-rose-500/15 text-rose-300 border-rose-500/30"
  : t === "B" ? "bg-orange-500/15 text-orange-300 border-orange-500/30"
  : t === "C" ? "bg-cyan-500/15 text-cyan-300 border-cyan-500/30"
  : "bg-zinc-500/15 text-zinc-300 border-zinc-500/30";

export default function PageAdminCapacityFramework() {
  const [live, setLive] = useState<LiveRow[]>([]);
  const [recos, setRecos] = useState<RecoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [filter, setFilter] = useState("");

  const load = async () => {
    setLoading(true);
    const [{ data: l }, { data: r }] = await Promise.all([
      supabase.from("v_capacity_live" as any).select("*").limit(2000),
      supabase.from("capacity_recommendations").select("*").limit(2000),
    ]);
    setLive((l as any[]) ?? []);
    setRecos((r as any[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleRun = async () => {
    setRunning(true);
    toast.info("Analyse en cours…");
    try {
      const stats = await runCapacitySnapshot();
      toast.success(`${stats.snapshots} cellules · ${stats.recommendations} recommandations`);
      if (stats.errors.length) toast.warning(stats.errors[0]);
      await load();
    } catch (e: any) {
      toast.error(e.message ?? "Erreur");
    } finally { setRunning(false); }
  };

  const overview = useMemo(() => {
    const total = live.length;
    const red = live.filter(l => l.band === "red").length;
    const yellow = live.filter(l => l.band === "yellow").length;
    const green = live.filter(l => l.band === "green").length;
    const sigEligible = recos.filter(r => r.slot_class === "signature" && r.status !== "open").length;
    const eliteEligible = recos.filter(r => r.slot_class === "elite" && r.status !== "open").length;
    return { total, red, yellow, green, sigEligible, eliteEligible };
  }, [live, recos]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return live;
    return live.filter(l =>
      l.trade_slug.includes(q) || l.city_slug.includes(q) || (l.city_name ?? "").toLowerCase().includes(q));
  }, [live, filter]);

  const byCity = (citySlug: string) => live.filter(l => l.city_slug === citySlug);
  const byTrade = useMemo(() => {
    const m = new Map<string, LiveRow[]>();
    live.forEach(l => { if (!m.has(l.trade_slug)) m.set(l.trade_slug, []); m.get(l.trade_slug)!.push(l); });
    return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [live]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Capacity Framework</h1>
          <p className="text-sm text-muted-foreground">Capacité, saturation et exclusivité par métier × ville (Québec)</p>
        </div>
        <Button onClick={handleRun} disabled={running}>
          {running ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          {running ? "Analyse en cours…" : "Recalculer maintenant"}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
        {[
          { label: "Cellules", value: overview.total, icon: Activity },
          { label: "Disponibles", value: overview.green, icon: Wrench },
          { label: "Limitées", value: overview.yellow, icon: Flame },
          { label: "Bientôt complet", value: overview.red, icon: Lock },
          { label: "Éligibles Élite", value: overview.eliteEligible, icon: MapPin },
          { label: "Éligibles Signature", value: overview.sigEligible, icon: MapPin },
        ].map((kpi) => (
          <Card key={kpi.label}><CardContent className="pt-6">
            <div className="flex items-center justify-between"><span className="text-xs text-muted-foreground">{kpi.label}</span><kpi.icon className="h-4 w-4 text-muted-foreground" /></div>
            <div className="mt-1 text-2xl font-semibold">{kpi.value}</div>
          </CardContent></Card>
        ))}
      </div>

      <Tabs defaultValue="cities">
        <TabsList>
          <TabsTrigger value="cities">Villes majeures</TabsTrigger>
          <TabsTrigger value="trades">Métiers</TabsTrigger>
          <TabsTrigger value="exclusivity">Exclusivité</TabsTrigger>
          <TabsTrigger value="all">Tout (heatmap)</TabsTrigger>
        </TabsList>

        <TabsContent value="cities" className="space-y-4">
          {MAJOR.map((slug) => {
            const rows = byCity(slug);
            if (!rows.length) return null;
            const pop = rows[0]?.population ?? 0;
            return (
              <Card key={slug}>
                <CardHeader><CardTitle className="flex items-center justify-between">
                  <span className="capitalize">{rows[0].city_name ?? slug}</span>
                  <span className="text-xs font-normal text-muted-foreground">Pop. {pop.toLocaleString("fr-CA")} · {rows.length} métiers · cap. totale {rows.reduce((s, r) => s + r.final_cap, 0)}</span>
                </CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
                    {rows.sort((a, b) => b.saturation_score - a.saturation_score).map((r) => (
                      <div key={r.trade_slug} className="flex items-center justify-between rounded-md border border-border/40 bg-card/40 px-3 py-2">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium capitalize">{r.trade_slug.replace(/-/g, " ")}</div>
                          <div className="text-xs text-muted-foreground">{r.active_pros}/{r.final_cap} actifs · gap {r.gap}</div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className={tierColor(r.cpc_tier)}>{r.cpc_tier ?? "—"}</Badge>
                          <Badge variant="outline" className={bandColor(r.band)}>{Math.round(r.saturation_score)}%</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {loading && <div className="text-sm text-muted-foreground">Chargement…</div>}
          {!loading && live.length === 0 && (
            <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">
              Aucune donnée. Cliquez sur « Recalculer maintenant » pour générer le premier instantané.
            </CardContent></Card>
          )}
        </TabsContent>

        <TabsContent value="trades">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {byTrade.map(([trade, rows]) => (
              <Card key={trade}>
                <CardHeader className="pb-2"><CardTitle className="text-base capitalize">{trade.replace(/-/g, " ")}</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-xs text-muted-foreground mb-2">{rows.length} villes · cap. totale {rows.reduce((s, r) => s + r.final_cap, 0)}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {rows.sort((a, b) => b.saturation_score - a.saturation_score).slice(0, 12).map(r => (
                      <Badge key={r.city_slug} variant="outline" className={bandColor(r.band)}>
                        {r.city_name ?? r.city_slug} · {Math.round(r.saturation_score)}%
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="exclusivity">
          <Card><CardHeader><CardTitle>Pipeline d'exclusivité</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {recos.filter(r => ["signature", "elite"].includes(r.slot_class) && r.status !== "open")
                  .sort((a, b) => a.status.localeCompare(b.status))
                  .slice(0, 100)
                  .map((r, i) => (
                    <div key={i} className="flex items-center justify-between rounded-md border border-border/40 px-3 py-2">
                      <div className="min-w-0">
                        <div className="text-sm font-medium capitalize">{r.trade_slug.replace(/-/g, " ")} · {r.city_slug}</div>
                        <div className="text-xs text-muted-foreground">{r.justification}</div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="capitalize">{r.slot_class}</Badge>
                        <Badge variant={r.status === "locked" ? "destructive" : "secondary"}>{r.status}</Badge>
                      </div>
                    </div>
                  ))}
                {recos.filter(r => ["signature", "elite"].includes(r.slot_class) && r.status !== "open").length === 0 && (
                  <div className="py-6 text-center text-sm text-muted-foreground">Aucune zone éligible pour le moment.</div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all">
          <div className="mb-3"><Input placeholder="Filtrer par métier ou ville…" value={filter} onChange={(e) => setFilter(e.target.value)} /></div>
          <Card><CardContent className="pt-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs uppercase text-muted-foreground">
                  <th className="pb-2">Métier</th><th>Ville</th><th className="text-right">Cap.</th>
                  <th className="text-right">Actifs</th><th className="text-right">Gap</th>
                  <th className="text-right">CPC</th><th className="text-right">Saturation</th>
                </tr></thead>
                <tbody>
                  {filtered.slice(0, 500).map((r, i) => (
                    <tr key={i} className="border-t border-border/30">
                      <td className="py-2 capitalize">{r.trade_slug.replace(/-/g, " ")}</td>
                      <td className="capitalize">{r.city_name ?? r.city_slug}</td>
                      <td className="text-right">{r.final_cap}</td>
                      <td className="text-right">{r.active_pros}</td>
                      <td className="text-right">{r.gap}</td>
                      <td className="text-right"><Badge variant="outline" className={tierColor(r.cpc_tier)}>{r.cpc_tier ?? "—"}</Badge></td>
                      <td className="text-right"><Badge variant="outline" className={bandColor(r.band)}>{Math.round(r.saturation_score)}%</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && <div className="py-6 text-center text-sm text-muted-foreground">Aucun résultat.</div>}
            </div>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
