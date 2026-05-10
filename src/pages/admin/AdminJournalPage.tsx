import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Loader2, Sparkles, Eye, Send, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";

const SUGGESTED = [
  { topic: "La fin du marché des soumissions : pourquoi l'infrastructure remplace la mise en relation", serie: "ai-operating-system" },
  { topic: "Home Passport : la mémoire manquante de la propriété résidentielle", serie: "property-intelligence-thesis" },
  { topic: "L'organisation semi-autonome : comment l'IA exécute le réel", serie: "ai-operating-system" },
  { topic: "Property Intelligence : du bâtiment statique au jumeau prédictif", serie: "property-intelligence-thesis" },
  { topic: "Trust Infrastructure : pourquoi la confiance devient le moteur économique des services à domicile", serie: "trust-infrastructure" },
];

export default function AdminJournalPage() {
  const qc = useQueryClient();
  const [topic, setTopic] = useState("");
  const [angle, setAngle] = useState("");
  const [serie, setSerie] = useState("property-intelligence-thesis");
  const [generating, setGenerating] = useState(false);

  const { data: articles = [] } = useQuery({
    queryKey: ["admin-journal-articles"],
    queryFn: async () => {
      const { data } = await supabase
        .from("journal_articles")
        .select("id,slug,title,status,tier,word_count,reading_time_minutes,created_at,published_at")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const generate = async (topicOverride?: string, serieOverride?: string) => {
    const t = topicOverride ?? topic;
    if (!t) {
      toast({ title: "Sujet requis", variant: "destructive" });
      return;
    }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("journal-generate-draft", {
        body: { topic: t, angle, tier: "flagship", serie_slug: serieOverride ?? serie, target_words: 4000, auto_save: true },
      });
      if (error) throw error;
      toast({ title: "Brouillon créé", description: `${data.slug} · ${data.word_count} mots — statut : review` });
      setTopic("");
      setAngle("");
      qc.invalidateQueries({ queryKey: ["admin-journal-articles"] });
    } catch (e: any) {
      toast({ title: "Échec génération", description: e.message ?? String(e), variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const publish = async (id: string) => {
    const { error } = await supabase
      .from("journal_articles")
      .update({ status: "published", published_at: new Date().toISOString() })
      .eq("id", id);
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Publié" });
      qc.invalidateQueries({ queryKey: ["admin-journal-articles"] });
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Supprimer cet article ?")) return;
    const { error } = await supabase.from("journal_articles").delete().eq("id", id);
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Supprimé" });
      qc.invalidateQueries({ queryKey: ["admin-journal-articles"] });
    }
  };

  return (
    <main className="min-h-screen bg-background p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold">UNPRO Intelligence Journal — Cockpit</h1>
          <p className="text-muted-foreground mt-1">Génère, révise et publie des thèses d'infrastructure.</p>
        </div>

        <Card className="p-6 space-y-4">
          <h2 className="font-semibold flex items-center gap-2"><Sparkles className="h-4 w-4" /> Nouveau brouillon (Gemini 2.5 Pro)</h2>
          <Input placeholder="Sujet de l'essai…" value={topic} onChange={(e) => setTopic(e.target.value)} />
          <Textarea placeholder="Angle / thèse à défendre (optionnel)" value={angle} onChange={(e) => setAngle(e.target.value)} rows={2} />
          <select value={serie} onChange={(e) => setSerie(e.target.value)} className="w-full border rounded-md px-3 py-2 bg-background text-sm">
            <option value="property-intelligence-thesis">Property Intelligence Thesis</option>
            <option value="ai-operating-system">AI Operating System</option>
            <option value="trust-infrastructure">Trust Infrastructure</option>
          </select>
          <Button onClick={() => generate()} disabled={generating}>
            {generating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Génération…</> : "Générer le brouillon"}
          </Button>

          <div className="pt-4 border-t">
            <div className="text-xs text-muted-foreground mb-2">Corpus de lancement (5 thèses fondatrices)</div>
            <div className="space-y-1.5">
              {SUGGESTED.map((s, i) => (
                <Button
                  key={i}
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-left h-auto py-2"
                  disabled={generating}
                  onClick={() => generate(s.topic, s.serie)}
                >
                  <span className="text-xs">{s.topic}</span>
                </Button>
              ))}
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="font-semibold mb-4">Articles ({articles.length})</h2>
          <div className="space-y-2">
            {articles.map((a: any) => (
              <div key={a.id} className="flex items-center justify-between gap-3 p-3 border rounded-lg">
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{a.title}</div>
                  <div className="text-xs text-muted-foreground">
                    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] mr-2 ${a.status === "published" ? "bg-green-500/15 text-green-700" : "bg-amber-500/15 text-amber-700"}`}>
                      {a.status}
                    </span>
                    {a.tier} · {a.word_count ?? 0} mots · {a.reading_time_minutes ?? 0} min
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Link to={`/journal/${a.slug}`} target="_blank">
                    <Button variant="ghost" size="sm"><Eye className="h-3.5 w-3.5" /></Button>
                  </Link>
                  {a.status !== "published" && (
                    <Button variant="default" size="sm" onClick={() => publish(a.id)}>
                      <Send className="h-3.5 w-3.5 mr-1" /> Publier
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => remove(a.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
            {articles.length === 0 && <p className="text-sm text-muted-foreground">Aucun article. Génère le premier brouillon ci-dessus.</p>}
          </div>
        </Card>
      </div>
    </main>
  );
}
