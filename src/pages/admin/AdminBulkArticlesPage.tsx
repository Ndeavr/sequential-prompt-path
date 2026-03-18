/**
 * UNPRO — Admin Bulk Article Generator
 * Trigger bulk SEO article generation from topic backlog.
 */
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Rocket, CheckCircle2, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";

export default function AdminBulkArticlesPage() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState<any>(null);

  const { data: topics, refetch } = useQuery({
    queryKey: ["topic-backlog-bulk"],
    queryFn: async () => {
      const { data } = await supabase
        .from("topic_backlog")
        .select("*")
        .eq("source", "seo_bulk_march2026")
        .order("priority", { ascending: false });
      return data || [];
    },
  });

  const handleGenerate = async () => {
    setIsGenerating(true);
    setResults(null);
    toast.info("Génération lancée — ceci peut prendre plusieurs minutes...");

    try {
      const { data, error } = await supabase.functions.invoke("editorial-engine", {
        body: { action: "run_bulk_pipeline", source: "seo_bulk_march2026", limit: 10 },
      });

      if (error) throw error;
      setResults(data?.data || data);
      toast.success(`${data?.data?.generated || 0} articles générés!`);
      refetch();
    } catch (e: any) {
      toast.error("Erreur: " + (e.message || "Inconnu"));
      setResults({ error: e.message });
    } finally {
      setIsGenerating(false);
    }
  };

  const pendingCount = topics?.filter((t: any) => t.status === "pending").length || 0;
  const completedCount = topics?.filter((t: any) => t.status === "completed").length || 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Génération massive d'articles SEO</h1>
        <Button
          onClick={handleGenerate}
          disabled={isGenerating || pendingCount === 0}
          size="lg"
          className="gap-2"
        >
          {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
          {isGenerating ? "En cours..." : `Générer ${pendingCount} articles`}
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <Clock className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <div className="text-3xl font-bold">{pendingCount}</div>
            <div className="text-sm text-muted-foreground">En attente</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <CheckCircle2 className="h-8 w-8 mx-auto text-green-500 mb-2" />
            <div className="text-3xl font-bold">{completedCount}</div>
            <div className="text-sm text-muted-foreground">Complétés</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <Rocket className="h-8 w-8 mx-auto text-primary mb-2" />
            <div className="text-3xl font-bold">{topics?.length || 0}</div>
            <div className="text-sm text-muted-foreground">Total</div>
          </CardContent>
        </Card>
      </div>

      {/* Topic list */}
      <Card>
        <CardHeader>
          <CardTitle>Sujets dans le backlog</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {topics?.map((topic: any) => (
            <div key={topic.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              {topic.status === "completed" ? (
                <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
              ) : topic.status === "in_progress" ? (
                <Loader2 className="h-4 w-4 text-primary animate-spin shrink-0" />
              ) : (
                <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{topic.title_suggestion}</div>
                <div className="text-xs text-muted-foreground">{topic.category} • {topic.angle} • priorité {topic.priority}</div>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                topic.status === "completed" ? "bg-green-100 text-green-700" :
                topic.status === "in_progress" ? "bg-primary/10 text-primary" :
                "bg-muted text-muted-foreground"
              }`}>
                {topic.status}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Results */}
      {results && (
        <Card>
          <CardHeader>
            <CardTitle>Résultats de génération</CardTitle>
          </CardHeader>
          <CardContent>
            {results.error ? (
              <div className="flex items-center gap-2 text-destructive">
                <XCircle className="h-4 w-4" />
                <span>{results.error}</span>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-sm text-muted-foreground">
                  {results.generated} générés • {results.failed || 0} échoués • {results.published?.published || 0} publiés
                </div>
                {results.results?.map((r: any, i: number) => (
                  <div key={i} className={`p-3 rounded-lg text-sm ${r.error ? "bg-destructive/10" : "bg-green-50"}`}>
                    <div className="font-medium">{r.title}</div>
                    {r.error ? (
                      <div className="text-destructive text-xs mt-1">{r.error}</div>
                    ) : (
                      <div className="text-muted-foreground text-xs mt-1">
                        {r.steps?.join(" → ")} • Publié: {r.scheduledFor}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
