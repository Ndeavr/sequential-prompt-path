/**
 * UNPRO — Admin SEO Articles Agent
 * Route: /admin/seo-articles
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  FileText, Zap, CheckCircle, AlertTriangle, Clock, Globe, BarChart3, Loader2, Send,
} from "lucide-react";

const ARTICLE_TEMPLATES = [
  { title: "Condensation des fenêtres en hiver", category: "isolation", cities: ["Laval", "Terrebonne"] },
  { title: "Moisissure dans l'entretoit", category: "humidite", cities: ["Laval", "Terrebonne"] },
  { title: "Isolation du grenier insuffisante", category: "isolation", cities: ["Laval", "Terrebonne"] },
  { title: "Toiture qui coule pendant l'hiver", category: "toiture", cities: ["Laval", "Terrebonne"] },
  { title: "Infiltration d'eau par le toit plat", category: "toiture", cities: ["Laval", "Terrebonne"] },
  { title: "Ventilation de l'entretoit", category: "ventilation", cities: ["Laval", "Terrebonne"] },
  { title: "Barrage de glace sur la toiture", category: "toiture", cities: ["Laval", "Terrebonne"] },
  { title: "Humidité au sous-sol", category: "humidite", cities: ["Laval", "Terrebonne"] },
  { title: "Fissures de fondation", category: "fondation", cities: ["Laval", "Terrebonne"] },
  { title: "Drain français obstrué ou vieillissant", category: "fondation", cities: ["Laval", "Terrebonne"] },
  { title: "Rénovation de salle de bain contre l'humidité", category: "renovation", cities: ["Laval", "Terrebonne"] },
  { title: "Remplacement de fenêtres écoénergétiques", category: "fenetres", cities: ["Laval", "Terrebonne"] },
  { title: "Inspection préachat maison ancienne", category: "inspection", cities: ["Laval", "Terrebonne"] },
  { title: "Loi 16 et carnet d'entretien condo", category: "condo", cities: ["Laval", "Terrebonne"] },
  { title: "Isolation par uréthane giclé", category: "isolation", cities: ["Laval", "Terrebonne"] },
];

function slugify(title: string, city: string) {
  return `${title}-${city}`
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function AdminSeoArticles() {
  const qc = useQueryClient();
  const [generating, setGenerating] = useState(false);
  const [selectedCity, setSelectedCity] = useState<string>("all");

  const { data: articles = [] } = useQuery({
    queryKey: ["admin-seo-articles", selectedCity],
    queryFn: async () => {
      let q = supabase.from("seo_articles").select("*").order("created_at", { ascending: false }).limit(200);
      if (selectedCity !== "all") q = q.ilike("city", selectedCity);
      const { data } = await q;
      return (data as any[]) || [];
    },
  });

  const generateBatch = useMutation({
    mutationFn: async (city: string) => {
      setGenerating(true);
      const batch = ARTICLE_TEMPLATES
        .filter((t) => t.cities.includes(city))
        .map((t) => ({
          title: `${t.title} à ${city}`,
          city,
          slug: slugify(t.title, city),
          service_category: t.category,
        }));

      // Filter out already completed
      const existingSlugs = articles.filter((a) => a.generation_status === "completed").map((a) => a.slug);
      const toGenerate = batch.filter((b) => !existingSlugs.includes(b.slug));

      if (toGenerate.length === 0) {
        toast.info("Tous les articles sont déjà générés pour cette ville.");
        return { success: 0, failed: 0 };
      }

      // Send max 3 at a time to avoid timeouts
      const chunk = toGenerate.slice(0, 3);
      const { data, error } = await supabase.functions.invoke("seo-article-agent", {
        body: { articles: chunk },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`${data?.success || 0} articles générés avec succès`);
      if (data?.failed > 0) toast.warning(`${data.failed} articles en erreur`);
      qc.invalidateQueries({ queryKey: ["admin-seo-articles"] });
      setGenerating(false);
    },
    onError: (err: any) => {
      toast.error(`Erreur: ${err.message || "Échec de génération"}`);
      setGenerating(false);
    },
  });

  const published = articles.filter((a) => a.published);
  const pending = articles.filter((a) => a.generation_status === "pending");
  const failed = articles.filter((a) => a.generation_status === "failed");
  const cities = [...new Set(articles.map((a) => a.city))];

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary" />
            Agent Articles SEO
          </h1>
          <p className="text-muted-foreground text-sm">Génération automatique d'articles locaux enrichis</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            className="rounded-md border bg-background px-3 py-1.5 text-sm"
          >
            <option value="all">Toutes les villes</option>
            {cities.map((c) => <option key={c} value={c}>{c}</option>)}
            <option value="Laval">Laval</option>
            <option value="Terrebonne">Terrebonne</option>
          </select>
          <Button
            onClick={() => generateBatch.mutate("Laval")}
            disabled={generating}
            size="sm"
          >
            {generating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
            Générer Laval
          </Button>
          <Button
            onClick={() => generateBatch.mutate("Terrebonne")}
            disabled={generating}
            size="sm"
            variant="outline"
          >
            {generating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
            Générer Terrebonne
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KPI icon={<FileText className="h-4 w-4" />} label="Total articles" value={articles.length} />
        <KPI icon={<CheckCircle className="h-4 w-4 text-emerald-500" />} label="Publiés" value={published.length} />
        <KPI icon={<Clock className="h-4 w-4 text-amber-500" />} label="En attente" value={pending.length} />
        <KPI icon={<AlertTriangle className="h-4 w-4 text-red-500" />} label="Échoués" value={failed.length} />
        <KPI icon={<BarChart3 className="h-4 w-4 text-primary" />} label="Mots moyens" value={published.length > 0 ? Math.round(published.reduce((s, a) => s + (a.word_count || 0), 0) / published.length) : 0} />
      </div>

      <Tabs defaultValue="articles">
        <TabsList>
          <TabsTrigger value="articles">Articles ({articles.length})</TabsTrigger>
          <TabsTrigger value="templates">Templates ({ARTICLE_TEMPLATES.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="articles" className="mt-4">
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3">Titre</th>
                  <th className="text-left p-3">Ville</th>
                  <th className="text-center p-3">Mots</th>
                  <th className="text-center p-3">FAQ</th>
                  <th className="text-center p-3">Liens</th>
                  <th className="text-center p-3">SEO</th>
                  <th className="text-center p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {articles.map((a) => (
                  <tr key={a.id} className="border-t hover:bg-muted/30">
                    <td className="p-3 max-w-[250px] truncate font-medium">{a.title}</td>
                    <td className="p-3">{a.city}</td>
                    <td className="p-3 text-center font-mono">{a.word_count || "—"}</td>
                    <td className="p-3 text-center font-mono">{Array.isArray(a.faq) ? a.faq.length : 0}</td>
                    <td className="p-3 text-center font-mono">{Array.isArray(a.internal_links) ? a.internal_links.length : 0}</td>
                    <td className="p-3 text-center font-mono">{a.seo_score || "—"}</td>
                    <td className="p-3 text-center">
                      <Badge variant={a.generation_status === "completed" ? "default" : a.generation_status === "failed" ? "destructive" : "outline"}>
                        {a.generation_status}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {articles.length === 0 && (
                  <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Aucun article encore. Cliquez sur « Générer » pour démarrer.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="templates" className="mt-4">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {ARTICLE_TEMPLATES.map((t, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <p className="font-medium text-foreground text-sm">{t.title}</p>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="outline">{t.category}</Badge>
                    {t.cities.map((c) => <Badge key={c} variant="secondary" className="text-xs">{c}</Badge>)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
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
