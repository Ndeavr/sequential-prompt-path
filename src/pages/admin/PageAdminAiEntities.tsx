/**
 * UNPRO — Admin AI Entities Cockpit
 * Route: /admin/ai-entities
 * List + actions: ingest, summary, publish/unpublish, view evidence.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Loader2, ExternalLink, Sparkles, Globe, CheckCircle2, EyeOff, RefreshCw } from "lucide-react";

interface Row {
  id: string;
  slug: string;
  company_name: string;
  primary_service: string | null;
  primary_city: string | null;
  confidence_score: number;
  published: boolean;
  website: string | null;
  last_ingested_at: string | null;
  ai_summary: string | null;
  updated_at: string;
}

export default function PageAdminAiEntities() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<Record<string, string | null>>({});

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("ai_entities")
      .select("id, slug, company_name, primary_service, primary_city, confidence_score, published, website, last_ingested_at, ai_summary, updated_at")
      .order("updated_at", { ascending: false });
    if (error) toast({ title: "Erreur chargement", description: error.message, variant: "destructive" });
    setRows((data ?? []) as Row[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const run = async (id: string, fn: "ai-entity-ingest" | "ai-entity-scrape-website" | "ai-entity-summary", label: string) => {
    setBusy((b) => ({ ...b, [id]: label }));
    try {
      const { data, error } = await supabase.functions.invoke(fn, { body: { entity_id: id } });
      if (error) throw error;
      if (data && (data as any).ok === false) throw new Error((data as any).error || "Erreur inconnue");
      toast({ title: `${label} OK`, description: "Mise à jour effectuée." });
      await load();
    } catch (e: any) {
      toast({ title: `${label} échec`, description: e?.message ?? String(e), variant: "destructive" });
    } finally {
      setBusy((b) => ({ ...b, [id]: null }));
    }
  };

  const togglePublish = async (row: Row) => {
    setBusy((b) => ({ ...b, [row.id]: row.published ? "Dépublication…" : "Publication…" }));
    const { error } = await supabase.from("ai_entities").update({ published: !row.published }).eq("id", row.id);
    setBusy((b) => ({ ...b, [row.id]: null }));
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else { toast({ title: row.published ? "Dépublié" : "Publié" }); load(); }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">AI Entities</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Pages /ai/:slug — knowledge layer pour ChatGPT, Gemini, Perplexity.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className="h-4 w-4 mr-2" /> Rafraîchir
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : rows.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">
          Aucune entité IA. Créez-en via la migration ou le seed.
        </Card>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <Card key={r.id} className="p-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link to={`/ai/${r.slug}`} className="font-semibold hover:underline truncate" target="_blank">
                      {r.company_name}
                    </Link>
                    <Badge variant={r.published ? "default" : "secondary"}>
                      {r.published ? "Publié" : "Brouillon"}
                    </Badge>
                    <Badge variant="outline">Score {r.confidence_score}</Badge>
                    {r.primary_service && <Badge variant="outline">{r.primary_service}</Badge>}
                    {r.primary_city && <Badge variant="outline">{r.primary_city}</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 flex items-center gap-3 flex-wrap">
                    <span>/ai/{r.slug}</span>
                    {r.website && (
                      <a href={r.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:underline">
                        <Globe className="h-3 w-3" /> site
                      </a>
                    )}
                    <span>Ingéré: {r.last_ingested_at ? new Date(r.last_ingested_at).toLocaleString("fr-CA") : "jamais"}</span>
                    {r.ai_summary ? <span className="text-emerald-600">résumé IA ✓</span> : <span className="text-amber-600">pas de résumé</span>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" disabled={!!busy[r.id]} onClick={() => run(r.id, "ai-entity-scrape-website", "Scrape")}>
                    {busy[r.id] === "Scrape" ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Globe className="h-3 w-3 mr-1" />}
                    Scrape
                  </Button>
                  <Button size="sm" variant="outline" disabled={!!busy[r.id]} onClick={() => run(r.id, "ai-entity-summary", "Résumé IA")}>
                    {busy[r.id] === "Résumé IA" ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />}
                    Résumé IA
                  </Button>
                  <Button size="sm" disabled={!!busy[r.id]} onClick={() => run(r.id, "ai-entity-ingest", "Pipeline")}>
                    {busy[r.id] === "Pipeline" ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />}
                    Pipeline complet
                  </Button>
                  <Button size="sm" variant={r.published ? "secondary" : "default"} disabled={!!busy[r.id]} onClick={() => togglePublish(r)}>
                    {r.published ? <><EyeOff className="h-3 w-3 mr-1" />Dépublier</> : <><CheckCircle2 className="h-3 w-3 mr-1" />Publier</>}
                  </Button>
                  <Button size="sm" variant="ghost" asChild>
                    <Link to={`/ai/${r.slug}`} target="_blank"><ExternalLink className="h-3 w-3" /></Link>
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
