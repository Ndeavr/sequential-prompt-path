/**
 * UNPRO — Activities Secondary Manager
 * Manage everyday high-frequency services with seasonality mapping and frequency scoring.
 */
import { useState } from "react";
import AdminLayout from "@/layouts/AdminLayout";
import { PageHeader, StatCard, LoadingState, EmptyState } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Flame, Timer, RefreshCw, Droplets, Truck, Wrench, Sparkles, Home,
  TrendingUp, Zap, BarChart3, Target, Sun, Snowflake, Leaf, CloudSun,
} from "lucide-react";

/* ─── Types ─── */
type SecondaryActivity = {
  id: string;
  name: string;
  category: string;
  frequency_score: number;
  seasonality_peak: string;
  avg_ticket_value: number;
  repeat_frequency: string;
  urgency_level: number;
  cross_sell_score: number;
  linked_primary_names_json: any;
  status: string;
};

/* ─── Constants ─── */
const CATEGORY_META: Record<string, { label: string; icon: typeof Flame; color: string }> = {
  exterieur_saisonnier: { label: "Extérieur / Saisonnier", icon: Droplets, color: "bg-blue-500/10 text-blue-400" },
  demenagement: { label: "Déménagement", icon: Truck, color: "bg-orange-500/10 text-orange-400" },
  entretien_exterieur: { label: "Entretien Extérieur", icon: Wrench, color: "bg-emerald-500/10 text-emerald-400" },
  installations_simples: { label: "Installations Simples", icon: Zap, color: "bg-purple-500/10 text-purple-400" },
  entretien_general: { label: "Entretien Général", icon: Home, color: "bg-pink-500/10 text-pink-400" },
  general: { label: "Général", icon: Sparkles, color: "bg-muted text-muted-foreground" },
};

const SEASON_ICON: Record<string, typeof Sun> = {
  printemps: Leaf,
  ete: Sun,
  automne: CloudSun,
  hiver: Snowflake,
  year_round: RefreshCw,
};

const freqBadge = (score: number) => {
  if (score >= 8) return { label: "🔥 Haute fréquence", cls: "bg-red-500/20 text-red-300 border-red-500/30" };
  if (score >= 5) return { label: "♻️ Récurrent", cls: "bg-amber-500/20 text-amber-300 border-amber-500/30" };
  return { label: "⏱️ Occasionnel", cls: "bg-muted text-muted-foreground" };
};

/* ─── Hooks ─── */
const useSecondaryActivities = () =>
  useQuery({
    queryKey: ["activities-secondary-extended"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activities_secondary")
        .select("*")
        .eq("status", "active")
        .order("frequency_score", { ascending: false });
      if (error) throw error;
      return (data ?? []) as SecondaryActivity[];
    },
  });

const useGenerateSecondaryTargets = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("fn-generate-matrix-targets");
      if (error) throw error;
      return data;
    },
    onSuccess: (d) => {
      toast.success(`${d?.targets_generated ?? 0} cibles générées/mises à jour`);
      qc.invalidateQueries({ queryKey: ["generation-targets"] });
    },
    onError: (e: any) => toast.error(e.message),
  });
};

/* ─── Sub-components ─── */
const FrequencyBadge = ({ score }: { score: number }) => {
  const b = freqBadge(score);
  return <Badge variant="outline" className={b.cls}>{b.label}</Badge>;
};

const SeasonBadge = ({ peak }: { peak: string }) => {
  const Icon = SEASON_ICON[peak] || RefreshCw;
  const label = peak === "year_round" ? "Toute l'année" : peak.charAt(0).toUpperCase() + peak.slice(1);
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <Icon className="h-3 w-3" /> {label}
    </span>
  );
};

const LinkedPrimaries = ({ json }: { json: any }) => {
  const names: string[] = typeof json === "string" ? JSON.parse(json) : (json ?? []);
  return (
    <div className="flex flex-wrap gap-1">
      {names.map((n) => (
        <Badge key={n} variant="secondary" className="text-[10px] px-1.5 py-0">{n}</Badge>
      ))}
    </div>
  );
};

/* ─── Category Table ─── */
const CategorySection = ({ catKey, items }: { catKey: string; items: SecondaryActivity[] }) => {
  const meta = CATEGORY_META[catKey] || CATEGORY_META.general;
  const Icon = meta.icon;
  return (
    <Card className="border-border/30 bg-card/60 backdrop-blur">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <span className={`p-1.5 rounded-lg ${meta.color}`}><Icon className="h-4 w-4" /></span>
          {meta.label}
          <Badge variant="outline" className="ml-auto text-xs">{items.length} services</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="border-border/20">
              <TableHead>Service</TableHead>
              <TableHead className="text-center">Fréquence</TableHead>
              <TableHead className="text-center">Saison</TableHead>
              <TableHead className="text-center">Ticket moy.</TableHead>
              <TableHead className="text-center">Urgence</TableHead>
              <TableHead>Activités liées</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((a) => (
              <TableRow key={a.id} className="border-border/10">
                <TableCell className="font-medium">{a.name}</TableCell>
                <TableCell className="text-center">
                  <FrequencyBadge score={a.frequency_score} />
                </TableCell>
                <TableCell className="text-center">
                  <SeasonBadge peak={a.seasonality_peak} />
                </TableCell>
                <TableCell className="text-center text-sm">{a.avg_ticket_value ? `${a.avg_ticket_value}$` : "—"}</TableCell>
                <TableCell className="text-center">
                  <span className={`text-xs font-bold ${a.urgency_level >= 4 ? "text-red-400" : a.urgency_level >= 3 ? "text-amber-400" : "text-muted-foreground"}`}>
                    {a.urgency_level}/5
                  </span>
                </TableCell>
                <TableCell><LinkedPrimaries json={a.linked_primary_names_json} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

/* ─── Seasonality Heatmap ─── */
const SeasonalityHeatmap = ({ data }: { data: SecondaryActivity[] }) => {
  const seasons = ["printemps", "ete", "automne", "hiver", "year_round"];
  const seasonLabels: Record<string, string> = {
    printemps: "🌱 Printemps", ete: "☀️ Été", automne: "🍂 Automne", hiver: "❄️ Hiver", year_round: "🔄 Toute l'année",
  };
  const grouped = seasons.map((s) => ({
    season: s,
    label: seasonLabels[s],
    items: data.filter((d) => d.seasonality_peak === s).sort((a, b) => b.frequency_score - a.frequency_score),
  }));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {grouped.map(({ season, label, items }) => (
        <Card key={season} className="border-border/30 bg-card/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{label} ({items.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {items.length === 0 && <p className="text-xs text-muted-foreground">Aucun service</p>}
            {items.map((i) => (
              <div key={i.id} className="flex items-center justify-between text-xs py-1 px-2 rounded bg-muted/30">
                <span className="truncate">{i.name}</span>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${i.frequency_score >= 8 ? "bg-red-500" : i.frequency_score >= 5 ? "bg-amber-500" : "bg-muted-foreground"}`}
                      style={{ width: `${i.frequency_score * 10}%` }}
                    />
                  </div>
                  <span className="text-muted-foreground w-4 text-right">{i.frequency_score}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

/* ─── Main Page ─── */
const PageAdminActivitiesSecondaryManager = () => {
  const { data, isLoading } = useSecondaryActivities();
  const generateMutation = useGenerateSecondaryTargets();
  const [tab, setTab] = useState("services");

  if (isLoading) return <AdminLayout><LoadingState message="Chargement des services..." /></AdminLayout>;

  const activities = data ?? [];
  const categories = Object.keys(CATEGORY_META);
  const grouped = categories
    .map((c) => ({ key: c, items: activities.filter((a) => a.category === c) }))
    .filter((g) => g.items.length > 0);

  const highFreq = activities.filter((a) => a.frequency_score >= 8).length;
  const avgTicket = activities.length ? Math.round(activities.reduce((s, a) => s + (a.avg_ticket_value || 0), 0) / activities.length) : 0;

  return (
    <AdminLayout>
      <PageHeader
        title="Services Secondaires"
        subtitle="Services du quotidien haute fréquence — Extension viralité locale"
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard title="Services actifs" value={activities.length} icon={<Target className="h-5 w-5" />} />
        <StatCard title="Haute fréquence" value={highFreq} icon={<Flame className="h-5 w-5 text-red-400" />} />
        <StatCard title="Ticket moyen" value={`${avgTicket}$`} icon={<TrendingUp className="h-5 w-5" />} />
        <StatCard title="Catégories" value={grouped.length} icon={<BarChart3 className="h-5 w-5" />} />
      </div>

      {/* Actions */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <Button onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending} size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${generateMutation.isPending ? "animate-spin" : ""}`} />
          Régénérer cibles matrice
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-muted/30 mb-4">
          <TabsTrigger value="services">📋 Services</TabsTrigger>
          <TabsTrigger value="seasonality">🗓️ Saisonnalité</TabsTrigger>
        </TabsList>

        <TabsContent value="services" className="space-y-6">
          {grouped.length === 0 ? (
            <EmptyState message="Aucun service secondaire trouvé" />
          ) : (
            grouped.map((g) => <CategorySection key={g.key} catKey={g.key} items={g.items} />)
          )}
        </TabsContent>

        <TabsContent value="seasonality">
          <SeasonalityHeatmap data={activities} />
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
};

export default PageAdminActivitiesSecondaryManager;
