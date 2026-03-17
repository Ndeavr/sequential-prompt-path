import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  FlaskConical, Play, Trash2, Bug, Loader2, CheckCircle2,
  XCircle, AlertTriangle, ChevronDown, ChevronUp,
} from "lucide-react";

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
  handlers: string[];
  agents_missing_handlers: string[];
  tasks: any[];
  recent_logs: any[];
  agents: any[];
}

const AgentSandbox = () => {
  const [loading, setLoading] = useState<string | null>(null);
  const [seedResult, setSeedResult] = useState<any>(null);
  const [execResult, setExecResult] = useState<any>(null);
  const [debugData, setDebugData] = useState<DebugData | null>(null);
  const [showDebug, setShowDebug] = useState(false);

  const invoke = async (action: string) => {
    setLoading(action);
    try {
      const { data, error } = await supabase.functions.invoke("agent-orchestrator", {
        body: { action },
      });
      if (error) throw error;
      return data;
    } finally {
      setLoading(null);
    }
  };

  const handleSeed = async () => {
    const data = await invoke("seed_test");
    setSeedResult(data);
    toast.success(`${data?.tasks_created?.length ?? 0} tâches de test créées`);
  };

  const handleAnalyze = async () => {
    const data = await invoke("analyze");
    setExecResult(data);
    toast.success(`Analyse: ${data?.proposals?.length ?? 0} propositions, ${data?.execution?.executed ?? 0} exécutées`);
  };

  const handleExecute = async () => {
    const data = await invoke("execute");
    setExecResult(data);
    toast.success(`Exécution: ${data?.succeeded ?? 0} réussies, ${data?.failed ?? 0} échouées`);
  };

  const handleCleanup = async () => {
    const data = await invoke("cleanup_test");
    setSeedResult(null);
    setExecResult(null);
    toast.info(`Nettoyé: ${data?.tasks_deleted ?? 0} tâches, ${data?.logs_deleted ?? 0} logs`);
  };

  const handleDebug = async () => {
    const data = await invoke("debug");
    setDebugData(data);
    setShowDebug(true);
  };

  return (
    <div className="space-y-4">
      {/* Sandbox Controls */}
      <Card className="glass-surface border-border/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
            <FlaskConical className="h-3.5 w-3.5 text-orange-400" />
            Sandbox de Test
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-[10px] h-8 rounded-lg"
              onClick={handleSeed}
              disabled={!!loading}
            >
              {loading === "seed_test" ? <Loader2 className="h-3 w-3 animate-spin" /> : <FlaskConical className="h-3 w-3" />}
              Créer données test
            </Button>
            <Button
              size="sm"
              className="gap-1.5 text-[10px] h-8 rounded-lg"
              onClick={handleAnalyze}
              disabled={!!loading}
            >
              {loading === "analyze" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
              Lancer analyse
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="gap-1.5 text-[10px] h-8 rounded-lg"
              onClick={handleExecute}
              disabled={!!loading}
            >
              {loading === "execute" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
              Exécuter éligibles
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="gap-1.5 text-[10px] h-8 rounded-lg"
              onClick={handleCleanup}
              disabled={!!loading}
            >
              {loading === "cleanup_test" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
              Nettoyer test
            </Button>
          </div>

          <Button
            size="sm"
            variant="ghost"
            className="w-full gap-1.5 text-[10px] h-7 rounded-lg"
            onClick={handleDebug}
            disabled={!!loading}
          >
            {loading === "debug" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Bug className="h-3 w-3" />}
            Diagnostic complet
          </Button>

          {/* Seed Result */}
          {seedResult && (
            <div className="p-2 rounded-lg bg-muted/30 border border-border/30 space-y-1">
              <p className="text-[10px] font-semibold text-foreground">Données créées:</p>
              {seedResult.tasks_created?.map((t: any) => (
                <div key={t.id} className="flex items-center gap-1.5 text-[9px]">
                  <Badge variant="outline" className="text-[8px] px-1 py-0">{t.status}</Badge>
                  <span className="text-muted-foreground truncate">{t.task_title}</span>
                  <span className="text-muted-foreground/50 font-mono">{t.id.slice(0, 8)}</span>
                </div>
              ))}
              {seedResult.tasks_error && (
                <p className="text-[9px] text-destructive">Erreur: {seedResult.tasks_error}</p>
              )}
            </div>
          )}

          {/* Execution Result */}
          {execResult && (
            <div className="p-2 rounded-lg bg-primary/5 border border-primary/20 space-y-1">
              <p className="text-[10px] font-semibold text-foreground">Résultat exécution:</p>
              {execResult.context && (
                <div className="grid grid-cols-3 gap-1 text-[9px]">
                  <span>Users: {execResult.context.totalUsers}</span>
                  <span>Contractors: {execResult.context.totalContractors}</span>
                  <span>SEO: {execResult.context.totalSeoPages}</span>
                  <span>RAG: {execResult.context.ragDocuments}</span>
                  <span>Agents: {execResult.context.activeAgents}</span>
                  <span>Subs: {execResult.context.activeSubscriptions}</span>
                </div>
              )}
              {execResult.proposals && (
                <p className="text-[9px] text-muted-foreground">
                  {execResult.proposals.length} propositions, {execResult.stored ?? 0} nouvelles
                </p>
              )}
              {execResult.execution && (
                <div className="flex items-center gap-2 text-[9px]">
                  <span className="flex items-center gap-0.5">
                    <CheckCircle2 className="h-2.5 w-2.5 text-green-400" />
                    {execResult.execution.succeeded ?? execResult.succeeded ?? 0} réussies
                  </span>
                  <span className="flex items-center gap-0.5">
                    <XCircle className="h-2.5 w-2.5 text-destructive" />
                    {execResult.execution.failed ?? execResult.failed ?? 0} échouées
                  </span>
                </div>
              )}
              {execResult.execution?.results?.map((r: any, i: number) => (
                <div key={i} className="text-[9px] p-1 rounded bg-muted/20">
                  <span className={r.success ? "text-green-400" : "text-destructive"}>
                    {r.success ? "✓" : "✗"}
                  </span>{" "}
                  <span className="font-medium">{r.title}</span>
                  <p className="text-muted-foreground mt-0.5">{r.summary}</p>
                </div>
              ))}
              {/* Direct results for batch execute */}
              {execResult.results?.map((r: any, i: number) => (
                <div key={i} className="text-[9px] p-1 rounded bg-muted/20">
                  <span className={r.success ? "text-green-400" : "text-destructive"}>
                    {r.success ? "✓" : "✗"}
                  </span>{" "}
                  <span className="font-medium">{r.title}</span>
                  <p className="text-muted-foreground mt-0.5">{r.summary}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Debug Panel */}
      {debugData && (
        <Card className="glass-surface border-border/30">
          <CardHeader className="pb-2 cursor-pointer" onClick={() => setShowDebug(!showDebug)}>
            <CardTitle className="text-xs font-semibold flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Bug className="h-3.5 w-3.5 text-orange-400" />
                Diagnostic Système
              </span>
              {showDebug ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </CardTitle>
          </CardHeader>
          {showDebug && (
            <CardContent className="space-y-3">
              {/* Summary counters */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { label: "Tâches totales", value: debugData.summary.total_tasks },
                  { label: "Logs", value: debugData.summary.total_logs },
                  { label: "Agents", value: debugData.summary.total_agents },
                  { label: "Handlers", value: debugData.summary.handlers_registered },
                  { label: "Agents avec handler", value: debugData.summary.agents_with_handlers },
                  { label: "Agents sans handler", value: debugData.summary.agents_without_handlers },
                  { label: "Snapshots métriques", value: debugData.summary.total_metrics_snapshots },
                ].map((s, i) => (
                  <div key={i} className="text-center p-1.5 rounded bg-muted/20">
                    <p className="text-sm font-bold text-foreground">{s.value}</p>
                    <p className="text-[9px] text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Tasks by status */}
              <div>
                <p className="text-[10px] font-semibold mb-1">Tâches par statut:</p>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(debugData.summary.tasks_by_status).map(([status, count]) => (
                    <Badge key={status} variant="outline" className="text-[9px] px-1.5 py-0.5">
                      {status}: {count}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Handlers registered */}
              <div>
                <p className="text-[10px] font-semibold mb-1">Handlers enregistrés ({debugData.handlers.length}):</p>
                <div className="flex flex-wrap gap-1">
                  {debugData.handlers.map(h => (
                    <Badge key={h} className="text-[8px] px-1 py-0 bg-green-500/20 text-green-400 border border-green-500/30">
                      {h}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Agents without handlers */}
              {debugData.agents_missing_handlers.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold mb-1 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3 text-yellow-400" />
                    Agents sans handler ({debugData.agents_missing_handlers.length}):
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {debugData.agents_missing_handlers.map(h => (
                      <Badge key={h} variant="outline" className="text-[8px] px-1 py-0 text-yellow-400 border-yellow-500/30">
                        {h}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-[9px] text-muted-foreground mt-1">
                    Ces agents utilisent le handler par défaut (marquage manuel).
                  </p>
                </div>
              )}

              {/* Recent logs */}
              <div>
                <p className="text-[10px] font-semibold mb-1">Logs récents:</p>
                <div className="max-h-40 overflow-y-auto space-y-0.5">
                  {debugData.recent_logs.map((log: any) => (
                    <div key={log.id} className="flex items-start gap-1 text-[9px]">
                      <Badge
                        variant="outline"
                        className={`text-[7px] px-1 py-0 shrink-0 ${
                          log.log_type.includes("success") ? "text-green-400 border-green-500/30" :
                          log.log_type.includes("fail") || log.log_type.includes("error") ? "text-destructive border-destructive/30" :
                          ""
                        }`}
                      >
                        {log.log_type}
                      </Badge>
                      <span className="text-foreground truncate">{log.message}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tasks detail */}
              <div>
                <p className="text-[10px] font-semibold mb-1">Tâches détaillées:</p>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {debugData.tasks.map((t: any) => (
                    <div key={t.id} className="p-1.5 rounded bg-muted/20 text-[9px]">
                      <div className="flex items-center gap-1">
                        <Badge variant="outline" className={`text-[7px] px-1 py-0 ${
                          t.status === "completed" ? "text-green-400 border-green-500/30" :
                          t.status === "failed" ? "text-destructive border-destructive/30" :
                          t.status === "proposed" ? "text-orange-400 border-orange-500/30" :
                          t.status === "approved" ? "text-blue-400 border-blue-500/30" :
                          ""
                        }`}>
                          {t.status}
                        </Badge>
                        <span className="font-medium truncate">{t.task_title}</span>
                        <span className="text-muted-foreground/50 font-mono ml-auto">{t.id.slice(0, 8)}</span>
                      </div>
                      <div className="flex gap-2 mt-0.5 text-muted-foreground">
                        <span>agent: {t.agent_key}</span>
                        <span>impact: {t.impact_score}</span>
                        <span>auto: {t.auto_executable ? "oui" : "non"}</span>
                      </div>
                      {t.execution_result && (
                        <p className="mt-0.5 text-[8px]">
                          Output: {typeof t.execution_result === 'object' ? (t.execution_result as any).summary ?? JSON.stringify(t.execution_result) : String(t.execution_result)}
                        </p>
                      )}
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
