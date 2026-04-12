import AdminLayout from "@/layouts/AdminLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Activity, AlertTriangle, CheckCircle, XCircle, Clock, ArrowRight } from "lucide-react";

const stageLabel: Record<string, string> = {
  scraping_started: "Scraping en cours",
  scraping_completed: "Scraping terminé",
  qualification_started: "Qualification en cours",
  qualification_completed: "Qualification terminée",
  sending_started: "Envoi en cours",
  sending_completed: "Envoi terminé",
  completed: "Terminé",
  failed_scraping: "Échec scraping",
  failed_qualification: "Échec qualification",
  failed_sending: "Échec envoi",
  queued: "En file",
  paused_risk: "En pause",
};

export default function PageRunDiagnostics() {
  const { data: transitions, isLoading } = useQuery({
    queryKey: ["all-run-transitions"],
    queryFn: async () => {
      const { data } = await supabase.from("outbound_run_stage_transitions")
        .select("*").order("created_at", { ascending: false }).limit(100);
      return data || [];
    },
  });

  const { data: errors } = useQuery({
    queryKey: ["all-pipeline-errors"],
    queryFn: async () => {
      const { data } = await supabase.from("outbound_pipeline_errors")
        .select("*").order("created_at", { ascending: false }).limit(50);
      return data || [];
    },
  });

  const { data: runs } = useQuery({
    queryKey: ["all-autopilot-runs-diag"],
    queryFn: async () => {
      const { data } = await supabase.from("outbound_autopilot_runs")
        .select("*").order("created_at", { ascending: false }).limit(30);
      return data || [];
    },
  });

  // Summary counts
  const runsByStage: Record<string, number> = {};
  runs?.forEach((r: any) => {
    const s = r.current_stage || "unknown";
    runsByStage[s] = (runsByStage[s] || 0) + 1;
  });

  return (
    <AdminLayout>
      <div className="space-y-6 p-4 md:p-6">
        {/* Hero */}
        <div className="rounded-2xl bg-gradient-to-br from-red-500/10 via-background to-amber-500/5 border border-border/50 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-xl bg-red-500/20 flex items-center justify-center">
              <Activity className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold">Diagnostics Pipeline</h1>
              <p className="text-sm text-muted-foreground">Vérité backend — transitions, erreurs, compteurs réels</p>
            </div>
          </div>
        </div>

        {/* Pipeline Truth Meter */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(runsByStage).map(([stage, count]) => (
            <Card key={stage}>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold font-mono">{count}</div>
                <div className="text-xs text-muted-foreground mt-1">{stageLabel[stage] || stage}</div>
              </CardContent>
            </Card>
          ))}
          {!Object.keys(runsByStage).length && (
            <Card className="col-span-full"><CardContent className="p-6 text-center text-muted-foreground">Aucun run</CardContent></Card>
          )}
        </div>

        {/* Transition History */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><ArrowRight className="h-4 w-4" /> Historique des transitions</CardTitle></CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 text-center animate-pulse text-muted-foreground">Chargement…</div>
            ) : !transitions?.length ? (
              <div className="p-6 text-center text-muted-foreground">Aucune transition enregistrée</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>De</TableHead>
                    <TableHead></TableHead>
                    <TableHead>Vers</TableHead>
                    <TableHead>Résultat</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transitions.map((t: any) => (
                    <TableRow key={t.id}>
                      <TableCell className="text-sm">{stageLabel[t.from_stage] || t.from_stage || "—"}</TableCell>
                      <TableCell><ArrowRight className="h-3 w-3 text-muted-foreground" /></TableCell>
                      <TableCell className="text-sm font-medium">{stageLabel[t.to_stage] || t.to_stage}</TableCell>
                      <TableCell>
                        {t.transition_status === "success" ? (
                          <CheckCircle className="h-4 w-4 text-emerald-400" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-400" />
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{t.message}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(t.created_at).toLocaleString("fr-CA", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Pipeline Errors */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-red-400"><AlertTriangle className="h-4 w-4" /> Erreurs pipeline ({errors?.length || 0})</CardTitle></CardHeader>
          <CardContent className="p-0">
            {!errors?.length ? (
              <div className="p-6 text-center text-muted-foreground">Aucune erreur</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Étape</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Bloquant</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {errors.map((err: any) => (
                    <TableRow key={err.id}>
                      <TableCell className="font-mono text-sm">{stageLabel[err.stage] || err.stage}</TableCell>
                      <TableCell><Badge variant="outline" className="bg-red-500/10 text-red-400 text-xs">{err.error_code}</Badge></TableCell>
                      <TableCell className="text-sm">{err.error_message}</TableCell>
                      <TableCell>{err.is_blocking ? <XCircle className="h-4 w-4 text-red-400" /> : <Clock className="h-4 w-4 text-muted-foreground" />}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(err.created_at).toLocaleString("fr-CA")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
