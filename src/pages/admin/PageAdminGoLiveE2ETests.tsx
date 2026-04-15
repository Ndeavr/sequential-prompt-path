import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FlaskConical } from "lucide-react";

export default function PageAdminGoLiveE2ETests() {
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("verification_runs").select("*").order("started_at", { ascending: false }).limit(20)
      .then(({ data }) => { setRuns(data || []); setLoading(false); });
  }, []);

  const statusColor: Record<string, string> = {
    passed: "default", failed: "destructive", partial: "secondary", running: "outline",
  };

  return (
    <div className="min-h-screen bg-background p-4 max-w-4xl mx-auto space-y-4">
      <div className="flex items-center gap-2">
        <FlaskConical className="h-5 w-5 text-primary" />
        <h1 className="text-lg font-bold">Runs E2E</h1>
      </div>

      {loading ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground animate-pulse">Chargement…</CardContent></Card>
      ) : runs.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-xs text-muted-foreground">Aucun run de vérification</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {runs.map((run) => (
            <Card key={run.id}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium">{run.run_type}</span>
                      <Badge variant="outline" className="text-[10px]">{run.environment}</Badge>
                      <Badge variant={(statusColor[run.overall_status] || "outline") as any} className="text-[10px]">{run.overall_status}</Badge>
                    </div>
                    {run.summary && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {(run.summary as any)?.passed || 0}/{(run.summary as any)?.total || 0} passed • {(run.summary as any)?.incidents || 0} incidents
                      </p>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground">{new Date(run.started_at).toLocaleString("fr-CA")}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
