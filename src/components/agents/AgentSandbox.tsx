import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  FlaskConical, Play, Trash2, Bug, Loader2, CheckCircle2,
  XCircle, ChevronDown, ChevronUp, Database, Zap, BarChart3,
} from "lucide-react";

interface SandboxReport {
  batch_id?: string;
  cities?: { created: number; total: number };
  territories?: { created: number };
  seo_pages?: { created: number; with_faq: number; without_faq: number };
  contractors?: { created: number; total: number };
  properties?: { created: number };
  appointments?: { created: number };
  success?: boolean;
  error?: string;
}

interface DemoReport {
  context?: Record<string, number>;
  proposals?: any[];
  stored?: number;
  execution?: { executed: number; succeeded: number; failed: number; results: any[] };
}

interface CleanupReport {
  total_deleted?: number;
  cleanup?: Record<string, number>;
}

interface DebugData {
  summary: {
    total_tasks: number;
    tasks_by_status: Record<string, number>;
    total_logs: number;
    total_metrics_snapshots: number;
    total_agents: number;
    handlers_registered: number;
    agents_with_handlers: number;
    agents_without_handlers: number;
  };
  sandbox_data?: {
    contractors: number;
    properties: number;
    appointments: number;
    territories: number;
    seo_pages_total: number;
    seo_pages_published: number;
  };
  handlers: string[];
  agents_missing_handlers: string[];
  tasks: any[];
  recent_logs: any[];
  agents: any[];
}

const AgentSandbox = () => {
  const [loading, setLoading] = useState<string | null>(null);
  const [seedReport, setSeedReport] = useState<SandboxReport | null>(null);
  const [demoReport, setDemoReport] = useState<DemoReport | null>(null);
  const [cleanupReport, setCleanupReport] = useState<CleanupReport | null>(null);
  const [debugData, setDebugData] = useState<DebugData | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [showOutputs, setShowOutputs] = useState(false);

  const invoke = async (action: string, extra?: Record<string, any>) => {
    setLoading(action);
    try {
      const { data, error } = await supabase.functions.invoke("agent-orchestrator", {
        body: { action, ...extra },
      });
      if (error) throw error;
      return data;
    } catch (e: any) {
      toast.error(`Erreur: ${e.message || "Inconnue"}`);
      throw e;
    } finally {
      setLoading(null);
    }
  };

  const handleSeedDataset = async () => {
    const data = await invoke("seed_dataset");
    setSeedReport(data);
    const total = (data?.cities?.created ?? 0) + (data?.territories?.created ?? 0) + (data?.seo_pages?.created ?? 0) + (data?.contractors?.created ?? 0) + (data?.properties?.created ?? 0) + (data?.appointments?.created ?? 0);
    toast.success(`Dataset sandbox créé: ${total} éléments dans 6 tables`);
  };

  const handleDemoForcee = async () => {
    // 1. Check if dataset exists
    const debug = await invoke("debug");
    const hasSandbox = (debug?.sandbox_data?.contractors ?? 0) > 0;
    
    if (!hasSandbox) {
      toast.info("Création du dataset sandbox...");
      const seed = await invoke("seed_dataset");
      setSeedReport(seed);
    }

    // 2. Analyze
    toast.info("Lancement de l'analyse...");
    const analysis = await invoke("analyze");
    
    // 3. Execute eligible
    toast.info("Exécution des tâches éligibles...");
    const execution = await invoke("execute");

    setDemoReport({
      context: analysis?.context,
      proposals: analysis?.proposals,
      stored: analysis?.stored,
      execution: {
        executed: (analysis?.execution?.executed ?? 0) + (execution?.executed ?? 0),
        succeeded: (analysis?.execution?.succeeded ?? 0) + (execution?.succeeded ?? 0),
        failed: (analysis?.execution?.failed ?? 0) + (execution?.failed ?? 0),
        results: [...(analysis?.execution?.results ?? []), ...(execution?.results ?? [])],
      },
    });

    // 4. Refresh debug
    const freshDebug = await invoke("debug");
    setDebugData(freshDebug);
    setShowDebug(true);
    setShowOutputs(true);

    toast.success(`Démo complète: ${analysis?.proposals?.length ?? 0} propositions, ${(analysis?.execution?.executed ?? 0) + (execution?.executed ?? 0)} exécutées`);
  };

  const handleCleanup = async () => {
    const data = await invoke("cleanup_dataset");
    setCleanupReport(data);
    setSeedReport(null);
    setDemoReport(null);
    toast.info(`Nettoyage: ${data?.total_deleted ?? 0} éléments supprimés`);
  };

  const handleDebug = async () => {
    const data = await invoke("debug");
    setDebugData(data);
    setShowDebug(true);
  };

  const isLoading = !!loading;

  return (
    <div className="space-y-3">
      {/* Main Controls */}
      <Card className="glass-surface border-border/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
            <FlaskConical className="h-3.5 w-3.5 text-orange-400" />
            Sandbox Réseau Autonome
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Primary action */}
          <Button
            className="w-full gap-2 h-9 text-xs font-semibold rounded-lg"
            onClick={handleDemoForcee}
            disabled={isLoading}
          >
            {loading === "analyze" || loading === "execute" || loading === "seed_dataset"
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <Zap className="h-3.5 w-3.5" />
            }
            🚀 Lancer démo forcée complète
          </Button>

          <div className="grid grid-cols-3 gap-2">
            <Button size="sm" variant="outline" className="gap-1 text-[10px] h-7 rounded-lg" onClick={handleSeedDataset} disabled={isLoading}>
              {loading === "seed_dataset" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Database className="h-3 w-3" />}
              Créer dataset
            </Button>
            <Button size="sm" variant="ghost" className="gap-1 text-[10px] h-7 rounded-lg" onClick={handleDebug} disabled={isLoading}>
              {loading === "debug" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Bug className="h-3 w-3" />}
              Debug
            </Button>
            <Button size="sm" variant="destructive" className="gap-1 text-[10px] h-7 rounded-lg" onClick={handleCleanup} disabled={isLoading}>
              {loading === "cleanup_dataset" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
              Nettoyer
            </Button>
          </div>

          {/* Seed Report */}
          {seedReport?.success && (
            <div className="p-2 rounded-lg bg-muted/30 border border-border/30 space-y-1">
              <p className="text-[10px] font-semibold text-foreground flex items-center gap-1">
                <Database className="h-3 w-3 text-green-400" />
                Dataset créé — batch: <code className="text-[8px] text-muted-foreground">{seedReport.batch_id?.slice(-13)}</code>
              </p>
              <div className="grid grid-cols-3 gap-1 text-[9px]">
                <span>🏙️ Villes: {seedReport.cities?.created ?? 0}</span>
                <span>📍 Territoires: {seedReport.territories?.created ?? 0}</span>
                <span>📄 SEO pages: {seedReport.seo_pages?.created ?? 0}</span>
                <span>👷 Entrepreneurs: {seedReport.contractors?.created ?? 0}</span>
                <span>🏠 Propriétés: {seedReport.properties?.created ?? 0}</span>
                <span>📅 RDV: {seedReport.appointments?.created ?? 0}</span>
              </div>
            </div>
          )}

          {/* Cleanup Report */}
          {cleanupReport && (
            <div className="p-2 rounded-lg bg-destructive/5 border border-destructive/20 text-[9px]">
              <p className="font-semibold">🧹 Nettoyé: {cleanupReport.total_deleted} éléments</p>
              <div className="flex flex-wrap gap-2 mt-1">
                {Object.entries(cleanupReport.cleanup ?? {}).map(([table, count]) => (
                  <span key={table}>{table}: {count}</span>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Demo Results */}
      {demoReport && (
        <Card className="glass-surface border-border/30">
          <CardHeader className="pb-2 cursor-pointer" onClick={() => setShowOutputs(!showOutputs)}>
            <CardTitle className="text-xs font-semibold flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <BarChart3 className="h-3.5 w-3.5 text-primary" />
                Résultats Démo
              </span>
              {showOutputs ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </CardTitle>
          </CardHeader>
          {showOutputs && (
            <CardContent className="space-y-3">
              {/* Stats grid */}
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { label: "Propositions", value: demoReport.proposals?.length ?? 0, color: "text-blue-400" },
                  { label: "Stockées", value: demoReport.stored ?? 0, color: "text-purple-400" },
                  { label: "Exécutées", value: demoReport.execution?.executed ?? 0, color: "text-green-400" },
                  { label: "Échouées", value: demoReport.execution?.failed ?? 0, color: "text-destructive" },
                ].map((s, i) => (
                  <div key={i} className="text-center p-1.5 rounded bg-muted/20">
                    <p className={`text-sm font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-[8px] text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Proposals */}
              {(demoReport.proposals?.length ?? 0) > 0 && (
                <div>
                  <p className="text-[10px] font-semibold mb-1">Propositions générées:</p>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {demoReport.proposals?.map((p: any, i: number) => (
                      <div key={i} className="p-1.5 rounded bg-muted/20 text-[9px]">
                        <div className="flex items-center gap-1">
                          <Badge variant="outline" className={`text-[7px] px-1 py-0 ${
                            p.urgency === "critical" ? "text-destructive border-destructive/30" :
                            p.urgency === "high" ? "text-orange-400 border-orange-500/30" :
                            "text-blue-400 border-blue-500/30"
                          }`}>
                            {p.urgency} • {p.impact_score}
                          </Badge>
                          <span className="font-medium truncate">{p.task_title}</span>
                        </div>
                        <p className="text-muted-foreground mt-0.5">{p.task_description}</p>
                        <div className="flex gap-1 mt-0.5">
                          <Badge className="text-[7px] px-1 py-0 bg-primary/10 text-primary border-0">{p.agent_key}</Badge>
                          <Badge className="text-[7px] px-1 py-0 bg-muted text-muted-foreground border-0">{p.auto_executable ? "auto" : "manuel"}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Execution Results (TOP OUTPUTS) */}
              {(demoReport.execution?.results?.length ?? 0) > 0 && (
                <div>
                  <p className="text-[10px] font-semibold mb-1">🏆 Top Outputs générés:</p>
                  <div className="space-y-1.5 max-h-64 overflow-y-auto">
                    {demoReport.execution?.results?.map((r: any, i: number) => (
                      <div key={i} className="p-2 rounded-lg bg-primary/5 border border-primary/20 text-[9px]">
                        <div className="flex items-center gap-1">
                          <span className={r.success ? "text-green-400" : "text-destructive"}>
                            {r.success ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                          </span>
                          <span className="font-semibold">{r.title}</span>
                        </div>
                        <p className="text-foreground mt-1 font-medium">{r.summary}</p>
                        {r.details && (
                          <pre className="mt-1 p-1 rounded bg-muted/30 text-[8px] text-muted-foreground overflow-x-auto whitespace-pre-wrap">
                            {JSON.stringify(r.details, null, 2)}
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          )}
        </Card>
      )}

      {/* Debug Panel */}
      {debugData && (
        <Card className="glass-surface border-border/30">
          <CardHeader className="pb-2 cursor-pointer" onClick={() => setShowDebug(!showDebug)}>
            <CardTitle className="text-xs font-semibold flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Bug className="h-3.5 w-3.5 text-orange-400" />
                Debug Sandbox
              </span>
              {showDebug ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </CardTitle>
          </CardHeader>
          {showDebug && (
            <CardContent className="space-y-3">
              {/* Sandbox data counts */}
              {debugData.sandbox_data && (
                <div>
                  <p className="text-[10px] font-semibold mb-1">Données sandbox en DB:</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { label: "Contractors", value: debugData.sandbox_data.contractors },
                      { label: "Properties", value: debugData.sandbox_data.properties },
                      { label: "Appointments", value: debugData.sandbox_data.appointments },
                      { label: "Territoires actifs", value: debugData.sandbox_data.territories },
                      { label: "SEO pages total", value: debugData.sandbox_data.seo_pages_total },
                      { label: "SEO publiées", value: debugData.sandbox_data.seo_pages_published },
                    ].map((s, i) => (
                      <div key={i} className="text-center p-1 rounded bg-muted/20">
                        <p className="text-sm font-bold text-foreground">{s.value}</p>
                        <p className="text-[8px] text-muted-foreground">{s.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Task counts */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {[
                  { label: "Tâches totales", value: debugData.summary.total_tasks },
                  { label: "Handlers", value: debugData.summary.handlers_registered },
                  { label: "Agents + handler", value: debugData.summary.agents_with_handlers },
                  { label: "Agents - handler", value: debugData.summary.agents_without_handlers },
                ].map((s, i) => (
                  <div key={i} className="text-center p-1 rounded bg-muted/20">
                    <p className="text-sm font-bold text-foreground">{s.value}</p>
                    <p className="text-[8px] text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Tasks by status */}
              <div>
                <p className="text-[10px] font-semibold mb-1">Par statut:</p>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(debugData.summary.tasks_by_status).map(([status, count]) => (
                    <Badge key={status} variant="outline" className={`text-[8px] px-1.5 py-0.5 ${
                      status === "completed" ? "text-green-400 border-green-500/30" :
                      status === "failed" ? "text-destructive border-destructive/30" :
                      status === "proposed" ? "text-orange-400 border-orange-500/30" :
                      status === "approved" ? "text-blue-400 border-blue-500/30" :
                      status === "executing" ? "text-purple-400 border-purple-500/30" : ""
                    }`}>
                      {status}: {count}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Handlers */}
              <div>
                <p className="text-[10px] font-semibold mb-1">Handlers ({debugData.handlers.length}):</p>
                <div className="flex flex-wrap gap-1">
                  {debugData.handlers.map(h => (
                    <Badge key={h} className="text-[7px] px-1 py-0 bg-green-500/20 text-green-400 border border-green-500/30">
                      {h}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Recent logs */}
              <div>
                <p className="text-[10px] font-semibold mb-1">Logs récents:</p>
                <div className="max-h-32 overflow-y-auto space-y-0.5">
                  {debugData.recent_logs.slice(0, 10).map((log: any) => (
                    <div key={log.id} className="flex items-start gap-1 text-[8px]">
                      <Badge variant="outline" className={`text-[7px] px-1 py-0 shrink-0 ${
                        log.log_type.includes("success") ? "text-green-400 border-green-500/30" :
                        log.log_type.includes("fail") || log.log_type.includes("error") ? "text-destructive border-destructive/30" :
                        log.log_type.includes("sandbox") ? "text-orange-400 border-orange-500/30" : ""
                      }`}>
                        {log.log_type}
                      </Badge>
                      <span className="text-foreground truncate">{log.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
};

export default AgentSandbox;
