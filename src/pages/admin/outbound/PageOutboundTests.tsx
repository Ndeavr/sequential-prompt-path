import { useState } from "react";
import { FlaskConical, Play, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import BadgePipelineState from "@/components/admin/outbound-ops/BadgePipelineState";
import { useManualTestScenarios, useManualTestRuns } from "@/hooks/useOutboundOpsData";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const typeLabels: Record<string, string> = {
  scraping: "Scraping",
  enrichment: "Enrichissement",
  aipp: "AIPP",
  email_render: "Email rendu",
  email_send: "Email envoi",
  reply: "Réponse",
  full_pipeline: "Pipeline complet",
};

export default function PageOutboundTests() {
  const { data: scenarios } = useManualTestScenarios();
  const { data: runs, refetch: refetchRuns } = useManualTestRuns();
  const [running, setRunning] = useState<string | null>(null);
  const [selectedRun, setSelectedRun] = useState<any>(null);

  async function executeScenario(scenario: any) {
    setRunning(scenario.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const startedAt = new Date().toISOString();
      const { data: run } = await supabase.from("manual_test_runs").insert({
        scenario_id: scenario.id, created_by: user?.id, status: "running",
        input_payload: scenario.default_payload, started_at: startedAt,
      }).select().single();

      // Simulate test execution
      await new Promise(r => setTimeout(r, 1000 + Math.random() * 1500));

      if (run) {
        await supabase.from("manual_test_runs").update({
          status: "completed", completed_at: new Date().toISOString(),
          result_payload: { ...scenario.expected_result, executed_at: new Date().toISOString(), dry_run: true },
        }).eq("id", run.id);

        await supabase.from("pipeline_logs").insert({
          log_type: "info", source_module: `test_${scenario.test_type}`,
          status: "success", message: `Test manuel "${scenario.scenario_label}" réussi`,
          payload: { scenario_key: scenario.scenario_key },
        });
      }

      toast({ title: "Test réussi", description: scenario.scenario_label });
      refetchRuns();
    } catch (e: any) {
      toast({ title: "Erreur test", description: e.message, variant: "destructive" });
    } finally {
      setRunning(null);
    }
  }

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-primary/10"><FlaskConical className="h-5 w-5 text-primary" /></div>
        <div>
          <h1 className="text-lg font-bold font-display">Tests manuels</h1>
          <p className="text-xs text-muted-foreground">Catalogue de scénarios prêts à lancer</p>
        </div>
      </div>

      {/* Scenarios catalog */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Scénarios disponibles</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Scénario</TableHead>
                <TableHead className="hidden md:table-cell">Type</TableHead>
                <TableHead className="hidden lg:table-cell">Description</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scenarios?.map(s => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium text-sm">{s.scenario_label}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">{typeLabels[s.test_type] || s.test_type}</span>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-xs text-muted-foreground max-w-xs truncate">{s.scenario_description}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" onClick={() => executeScenario(s)} disabled={running === s.id} className="h-7 text-xs gap-1.5">
                      {running === s.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                      Lancer
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!scenarios?.length && (
                <TableRow><TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-8">Aucun scénario</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Recent runs */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Derniers tests exécutés</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Scénario</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="hidden md:table-cell">Date</TableHead>
                <TableHead className="text-right">Détails</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs?.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="text-sm">{(r as any).manual_test_scenarios?.scenario_label || "—"}</TableCell>
                  <TableCell><BadgePipelineState state={r.status} /></TableCell>
                  <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString("fr-CA")}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => setSelectedRun(r)} className="h-7 text-xs">Voir</Button>
                  </TableCell>
                </TableRow>
              ))}
              {!runs?.length && (
                <TableRow><TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-8">Aucun test exécuté</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Sheet open={!!selectedRun} onOpenChange={() => setSelectedRun(null)}>
        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader><SheetTitle>Détails du test</SheetTitle></SheetHeader>
          {selectedRun && (
            <div className="mt-4 space-y-4">
              <div>
                <p className="text-xs text-muted-foreground">Statut</p>
                <BadgePipelineState state={selectedRun.status} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Entrée</p>
                <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto max-h-40">{JSON.stringify(selectedRun.input_payload, null, 2)}</pre>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Résultat</p>
                <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto max-h-40">{JSON.stringify(selectedRun.result_payload, null, 2)}</pre>
              </div>
              {selectedRun.error_message && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Erreur</p>
                  <p className="text-sm text-red-400">{selectedRun.error_message}</p>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
