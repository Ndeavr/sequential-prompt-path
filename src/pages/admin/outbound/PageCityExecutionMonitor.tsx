import AdminLayout from "@/layouts/AdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MapPin, Rocket, Play, ChevronLeft, AlertTriangle, CheckCircle, Clock, Loader2, XCircle, Zap } from "lucide-react";
import { toast } from "sonner";

const stageDisplay: Record<string, { label: string; icon: any; cls: string }> = {
  queued: { label: "En file", icon: Clock, cls: "text-blue-400" },
  scraping_started: { label: "Scraping en cours", icon: Loader2, cls: "text-amber-400" },
  scraping_completed: { label: "Scraping terminé", icon: CheckCircle, cls: "text-emerald-400" },
  qualification_started: { label: "Qualification en cours", icon: Loader2, cls: "text-amber-400" },
  qualification_completed: { label: "Qualification terminée", icon: CheckCircle, cls: "text-emerald-400" },
  sending_started: { label: "Envoi en cours", icon: Loader2, cls: "text-amber-400" },
  sending_completed: { label: "Envoi terminé", icon: CheckCircle, cls: "text-emerald-400" },
  completed: { label: "Terminé", icon: CheckCircle, cls: "text-emerald-400" },
  failed_scraping: { label: "Échec scraping", icon: XCircle, cls: "text-red-400" },
  failed_qualification: { label: "Échec qualification", icon: XCircle, cls: "text-red-400" },
  failed_sending: { label: "Échec envoi", icon: XCircle, cls: "text-red-400" },
  paused_risk: { label: "En pause (risque)", icon: AlertTriangle, cls: "text-amber-400" },
};

export default function PageCityExecutionMonitor() {
  const { slug } = useParams<{ slug: string }>();
  const qc = useQueryClient();

  const { data: city } = useQuery({
    queryKey: ["city-target", slug],
    queryFn: async () => {
      const { data } = await supabase.from("agent_city_targets").select("*").eq("city_slug", slug!).single();
      return data;
    },
    enabled: !!slug,
  });

  const { data: services } = useQuery({
    queryKey: ["city-services", city?.id],
    queryFn: async () => {
      const { data } = await supabase.from("agent_city_service_targets").select("*")
        .eq("city_target_id", city!.id).order("execution_rank");
      return data || [];
    },
    enabled: !!city?.id,
  });

  const { data: runs } = useQuery({
    queryKey: ["city-runs", city?.id],
    queryFn: async () => {
      const { data } = await supabase.from("outbound_autopilot_runs").select("*")
        .eq("city_target_id", city!.id).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!city?.id,
  });

  const { data: scrapingRuns } = useQuery({
    queryKey: ["city-scraping-runs", city?.id],
    queryFn: async () => {
      const runIds = runs?.map((r: any) => r.id) || [];
      if (!runIds.length) return [];
      const { data } = await supabase.from("outbound_scraping_runs").select("*").in("run_id", runIds);
      return data || [];
    },
    enabled: !!runs?.length,
  });

  const { data: errors } = useQuery({
    queryKey: ["city-pipeline-errors", city?.id],
    queryFn: async () => {
      const runIds = runs?.map((r: any) => r.id) || [];
      if (!runIds.length) return [];
      const { data } = await supabase.from("outbound_pipeline_errors").select("*").in("run_id", runIds).order("created_at", { ascending: false }).limit(20);
      return data || [];
    },
    enabled: !!runs?.length,
  });

  // Generate cluster + waves + launch
  const generateAndLaunch = useMutation({
    mutationFn: async () => {
      if (!city?.id || !services?.length) throw new Error("No city or services");

      // 1. Rank services
      await supabase.functions.invoke("edge-city-orchestrator", {
        body: { action: "rank_services", city_target_id: city.id },
      });

      // 2. Generate cluster
      const { data: clusterRes } = await supabase.functions.invoke("edge-city-orchestrator", {
        body: { action: "generate_cluster", city_target_id: city.id },
      });

      // 3. Create waves
      const { data: wavesRes } = await supabase.functions.invoke("edge-city-orchestrator", {
        body: { action: "create_waves", city_cluster_id: clusterRes.cluster.id, city_target_id: city.id },
      });

      // 4. Refetch services (now ranked)
      const { data: rankedServices } = await supabase.from("agent_city_service_targets")
        .select("*").eq("city_target_id", city.id).order("execution_rank");

      // 5. Launch wave 1 only
      if (wavesRes?.waves?.length && rankedServices?.length) {
        await supabase.functions.invoke("edge-city-orchestrator", {
          body: {
            action: "launch_wave",
            wave_id: wavesRes.waves[0].id,
            city_target_id: city.id,
            city_service_target_id: rankedServices[0].id,
          },
        });
      }

      // Update city status
      await supabase.from("agent_city_targets").update({ status: "running" }).eq("id", city.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["city-runs"] });
      qc.invalidateQueries({ queryKey: ["city-services"] });
      qc.invalidateQueries({ queryKey: ["city-target"] });
      toast.success("Vague 1 lancée !");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const advanceStage = useMutation({
    mutationFn: async ({ run_id, to_stage }: { run_id: string; to_stage: string }) => {
      const { data } = await supabase.functions.invoke("edge-city-orchestrator", {
        body: { action: "advance_stage", run_id, to_stage },
      });
      if (!data?.ok) throw new Error(data?.error || "Transition failed");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["city-runs"] });
      toast.success("Étape avancée");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const getScrapingForRun = (runId: string) => scrapingRuns?.find((s: any) => s.run_id === runId);

  return (
    <AdminLayout>
      <div className="space-y-6 p-4 md:p-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link to="/admin/outbound/cities">
            <Button variant="ghost" size="sm"><ChevronLeft className="h-4 w-4" /></Button>
          </Link>
          <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <MapPin className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <h1 className="font-display text-xl font-bold">{city?.city_name || slug}</h1>
            <p className="text-sm text-muted-foreground">Cluster de {services?.length || 0} spécialités</p>
          </div>
          <Button onClick={() => generateAndLaunch.mutate()} disabled={generateAndLaunch.isPending || !services?.length}>
            <Rocket className="h-4 w-4 mr-1" /> {generateAndLaunch.isPending ? "Lancement…" : "Lancer vague 1"}
          </Button>
        </div>

        {/* Service Queue */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Zap className="h-4 w-4" /> File de services ({city?.city_name})</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead className="text-center">Priorité</TableHead>
                  <TableHead className="text-center">Vol. estimé</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {services?.map((svc: any) => (
                  <TableRow key={svc.id}>
                    <TableCell className="font-mono text-sm">{svc.execution_rank}</TableCell>
                    <TableCell className="font-semibold">{svc.service_name}</TableCell>
                    <TableCell className="text-center font-mono">{svc.priority_score}</TableCell>
                    <TableCell className="text-center">{svc.estimated_lead_volume}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{svc.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Real Pipeline Status */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Play className="h-4 w-4" /> Pipeline d'exécution — Vérité backend</CardTitle></CardHeader>
          <CardContent className="p-0">
            {!runs?.length ? (
              <div className="p-6 text-center text-muted-foreground">Aucun run lancé pour cette ville</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Marché</TableHead>
                    <TableHead>Étape réelle</TableHead>
                    <TableHead className="text-center">Scrapé</TableHead>
                    <TableHead className="text-center">Normalisé</TableHead>
                    <TableHead className="text-center">Leads</TableHead>
                    <TableHead>Dernière MAJ</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {runs.map((run: any) => {
                    const svc = services?.find((s: any) => s.id === run.city_service_target_id);
                    const stage = stageDisplay[run.current_stage] || { label: run.current_stage, icon: Clock, cls: "text-muted-foreground" };
                    const Icon = stage.icon;
                    const scraping = getScrapingForRun(run.id);

                    // Determine next valid stage for advancement
                    const nextStages: Record<string, string> = {
                      scraping_started: "scraping_completed",
                      scraping_completed: "qualification_started",
                      qualification_started: "qualification_completed",
                      qualification_completed: "sending_started",
                      sending_started: "sending_completed",
                      sending_completed: "completed",
                    };
                    const nextStage = nextStages[run.current_stage];

                    return (
                      <TableRow key={run.id}>
                        <TableCell className="font-semibold text-sm">
                          {svc?.service_name || "—"} {city?.city_name}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Icon className={`h-4 w-4 ${stage.cls} ${run.current_stage.includes("started") ? "animate-spin" : ""}`} />
                            <span className={`text-sm font-medium ${stage.cls}`}>{stage.label}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-mono text-sm">{scraping?.raw_entity_count ?? "—"}</TableCell>
                        <TableCell className="text-center font-mono text-sm">{scraping?.normalized_entity_count ?? "—"}</TableCell>
                        <TableCell className="text-center font-mono text-sm">{scraping?.lead_candidate_count ?? "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {run.last_transition_at ? new Date(run.last_transition_at).toLocaleString("fr-CA", { hour: "2-digit", minute: "2-digit" }) : "—"}
                        </TableCell>
                        <TableCell>
                          {nextStage && (
                            <Button
                              size="sm" variant="outline"
                              onClick={() => advanceStage.mutate({ run_id: run.id, to_stage: nextStage })}
                              disabled={advanceStage.isPending}
                            >
                              Avancer
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Pipeline Errors */}
        {errors && errors.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-red-400"><AlertTriangle className="h-4 w-4" /> Erreurs pipeline</CardTitle></CardHeader>
            <CardContent className="p-0">
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
                      <TableCell className="font-mono text-sm">{err.stage}</TableCell>
                      <TableCell><Badge variant="outline" className="bg-red-500/10 text-red-400">{err.error_code}</Badge></TableCell>
                      <TableCell className="text-sm">{err.error_message}</TableCell>
                      <TableCell>{err.is_blocking ? <XCircle className="h-4 w-4 text-red-400" /> : "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(err.created_at).toLocaleString("fr-CA")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
