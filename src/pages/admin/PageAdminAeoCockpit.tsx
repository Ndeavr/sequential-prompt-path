/**
 * /admin/aeo — AEO Domination cockpit
 * Coverage matrix + one-click batch regeneration.
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, RefreshCw, Sparkles } from "lucide-react";

export default function PageAdminAeoCockpit() {
  const qc = useQueryClient();
  const [running, setRunning] = useState<string | null>(null);

  const { data: stats, refetch } = useQuery({
    queryKey: ["aeo-stats"],
    queryFn: async () => {
      const [pp, sp, blocks, facts] = await Promise.all([
        supabase.from("aeo_problem_pages").select("status", { count: "exact", head: false }),
        supabase.from("aeo_service_pages").select("status", { count: "exact", head: false }),
        supabase.from("aeo_extraction_blocks").select("id", { count: "exact", head: true }),
        supabase.from("aeo_entity_facts").select("id", { count: "exact", head: true }),
      ]);
      const count = (rows: any[] | null, st: string) => (rows ?? []).filter((r) => r.status === st).length;
      return {
        problem_total: pp.data?.length ?? 0,
        problem_published: count(pp.data, "published"),
        problem_draft: count(pp.data, "draft"),
        service_total: sp.data?.length ?? 0,
        service_published: count(sp.data, "published"),
        service_draft: count(sp.data, "draft"),
        blocks: blocks.count ?? 0,
        facts: facts.count ?? 0,
      };
    },
    refetchInterval: 10000,
  });

  const runBatch = useMutation({
    mutationFn: async (kind: "problem_city" | "service_city") => {
      setRunning(kind);
      const { data, error } = await supabase.functions.invoke("aeo-batch-orchestrator", {
        body: { kind, limit: 10 },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      toast.success(`${data?.generated ?? 0} pages générées · ${data?.failed ?? 0} échecs`);
      qc.invalidateQueries({ queryKey: ["aeo-stats"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erreur de génération"),
    onSettled: () => setRunning(null),
  });

  const tile = (label: string, value: number | string, hint?: string) => (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-foreground">{value}</div>
        {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
      </CardContent>
    </Card>
  );

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" /> AEO Domination Cockpit
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Pages structurées et citables par les moteurs IA (ChatGPT, Gemini, Perplexity, AI Overviews).
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" /> Rafraîchir
        </Button>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {tile("Pages problèmes", stats?.problem_total ?? 0, `${stats?.problem_published ?? 0} publiées · ${stats?.problem_draft ?? 0} en attente`)}
        {tile("Pages services", stats?.service_total ?? 0, `${stats?.service_published ?? 0} publiées · ${stats?.service_draft ?? 0} en attente`)}
        {tile("Blocs AEO générés", stats?.blocks ?? 0, "Réponses rapides, FAQ, coûts…")}
        {tile("Faits structurés", stats?.facts ?? 0, "JSON-LD entity facts")}
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Génération en lot</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button
            onClick={() => runBatch.mutate("problem_city")}
            disabled={running !== null}
          >
            {running === "problem_city" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
            Générer 10 pages problème × ville
          </Button>
          <Button
            variant="secondary"
            onClick={() => runBatch.mutate("service_city")}
            disabled={running !== null}
          >
            {running === "service_city" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
            Générer 10 pages service × ville
          </Button>
          <Badge variant="outline" className="ml-auto self-center">
            Cron quotidien actif
          </Badge>
        </CardContent>
      </Card>
    </div>
  );
}
