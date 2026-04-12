import { useState } from "react";
import { Bot, Play, Pause, RotateCcw, Loader2, Clock, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import BadgePipelineState from "@/components/admin/outbound-ops/BadgePipelineState";
import { useAutomationJobs, useAutomationSchedules } from "@/hooks/useOutboundOpsData";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

const automationTypes = [
  { key: "scrape_prospect_batch", label: "Scraping prospects", icon: "🔍" },
  { key: "enrich_prospect_batch", label: "Enrichissement prospects", icon: "📊" },
  { key: "score_aipp_batch", label: "Scoring AIPP", icon: "📈" },
  { key: "generate_sequence_batch", label: "Génération séquences", icon: "✉️" },
  { key: "send_email_batch", label: "Envoi emails", icon: "📤" },
  { key: "sync_email_events", label: "Sync événements email", icon: "🔄" },
  { key: "classify_replies_batch", label: "Classification réponses", icon: "🤖" },
  { key: "stop_sequences_batch", label: "Arrêt séquences", icon: "🛑" },
  { key: "run_daily_health_snapshot", label: "Snapshot santé", icon: "💊" },
];

export default function PageOutboundAutomations() {
  const { data: jobs, refetch: refetchJobs } = useAutomationJobs();
  const { data: schedules, refetch: refetchSchedules } = useAutomationSchedules();
  const qc = useQueryClient();
  const [triggering, setTriggering] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<any>(null);

  const activeJobs = jobs?.filter(j => j.status === "running" || j.status === "queued").length || 0;
  const failedJobs = jobs?.filter(j => j.status === "failed").length || 0;

  async function triggerJob(type: string) {
    setTriggering(type);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("automation_jobs").insert({
        job_type: type, status: "queued", dry_run: true, created_by: user?.id,
        payload: { triggered_manually: true },
      });
      await supabase.from("pipeline_logs").insert({
        log_type: "info", source_module: type, status: "queued",
        message: `Job ${type} créé manuellement (dry-run)`,
      });
      toast({ title: "Job créé", description: `${type} ajouté à la file (dry-run)` });
      refetchJobs();
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setTriggering(null);
    }
  }

  async function updateJobStatus(jobId: string, newStatus: string) {
    await supabase.from("automation_jobs").update({ status: newStatus, updated_at: new Date().toISOString() }).eq("id", jobId);
    refetchJobs();
    toast({ title: "Statut mis à jour" });
  }

  async function toggleSchedule(type: string, enabled: boolean) {
    const existing = schedules?.find(s => s.automation_type === type);
    if (existing) {
      await supabase.from("automation_schedules").update({ is_enabled: enabled }).eq("id", existing.id);
    } else {
      await supabase.from("automation_schedules").insert({ automation_type: type, is_enabled: enabled });
    }
    refetchSchedules();
  }

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-primary/10"><Bot className="h-5 w-5 text-primary" /></div>
        <div>
          <h1 className="text-lg font-bold font-display">Automations</h1>
          <p className="text-xs text-muted-foreground">Déclencher, surveiller et contrôler les jobs batch</p>
        </div>
      </div>

      {/* Health summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-3 text-center">
          <p className="text-xs text-muted-foreground">Actifs</p>
          <p className="text-xl font-bold">{activeJobs}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-xs text-muted-foreground">Échoués</p>
          <p className="text-xl font-bold text-red-400">{failedJobs}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="text-xl font-bold">{jobs?.length || 0}</p>
        </CardContent></Card>
      </div>

      {/* Schedules */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Planification</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {automationTypes.map(at => {
            const schedule = schedules?.find(s => s.automation_type === at.key);
            return (
              <div key={at.key} className="flex items-center justify-between border rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <span>{at.icon}</span>
                  <span className="text-sm font-medium">{at.label}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Switch checked={schedule?.is_enabled || false} onCheckedChange={v => toggleSchedule(at.key, v)} />
                  <Button variant="outline" size="sm" onClick={() => triggerJob(at.key)} disabled={triggering === at.key} className="h-7 text-xs gap-1">
                    {triggering === at.key ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                    Lancer
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Jobs table */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Derniers jobs</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="hidden md:table-cell">Dry-run</TableHead>
                <TableHead className="hidden md:table-cell">Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs?.map(j => (
                <TableRow key={j.id}>
                  <TableCell className="text-sm font-medium">{j.job_type}</TableCell>
                  <TableCell><BadgePipelineState state={j.status} /></TableCell>
                  <TableCell className="hidden md:table-cell text-xs">{j.dry_run ? "✓ Oui" : "⚠️ Live"}</TableCell>
                  <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{new Date(j.created_at).toLocaleString("fr-CA")}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {j.status === "running" && (
                        <Button variant="ghost" size="sm" onClick={() => updateJobStatus(j.id, "paused")} className="h-7 px-2"><Pause className="h-3 w-3" /></Button>
                      )}
                      {j.status === "paused" && (
                        <Button variant="ghost" size="sm" onClick={() => updateJobStatus(j.id, "running")} className="h-7 px-2"><Play className="h-3 w-3" /></Button>
                      )}
                      {j.status === "failed" && (
                        <Button variant="ghost" size="sm" onClick={() => updateJobStatus(j.id, "queued")} className="h-7 px-2"><RotateCcw className="h-3 w-3" /></Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => setSelectedJob(j)} className="h-7 text-xs">Voir</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!jobs?.length && (
                <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">Aucun job</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Sheet open={!!selectedJob} onOpenChange={() => setSelectedJob(null)}>
        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader><SheetTitle>Détails du job</SheetTitle></SheetHeader>
          {selectedJob && (
            <div className="mt-4 space-y-4">
              <div className="flex items-center gap-2"><span className="text-sm font-medium">{selectedJob.job_type}</span><BadgePipelineState state={selectedJob.status} /></div>
              <div><p className="text-xs text-muted-foreground">Dry-run: {selectedJob.dry_run ? "Oui" : "Non"}</p></div>
              <div><p className="text-xs text-muted-foreground">Priorité: {selectedJob.priority}</p></div>
              {selectedJob.failure_reason && <div><p className="text-xs text-muted-foreground">Erreur</p><p className="text-sm text-red-400">{selectedJob.failure_reason}</p></div>}
              <div><p className="text-xs text-muted-foreground mb-1">Payload</p><pre className="text-xs bg-muted p-3 rounded-lg overflow-auto max-h-40">{JSON.stringify(selectedJob.payload, null, 2)}</pre></div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
