import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  ArrowLeft, Activity, CheckCircle2, AlertCircle, Loader2,
  RefreshCw, ShieldCheck, Send, Clock, XCircle, Info,
} from "lucide-react";

type RunRow = {
  id: string;
  trade: string;
  cities: string[];
  status: string;
  current_stage: string | null;
  last_step: string | null;
  next_action: string | null;
  block_reason: string | null;
  alert_admin: boolean;
  dry_run: boolean;
  target_limit: number;
  target_count: number;
  scraped_count: number;
  deduplicated_count: number;
  enriched_count: number;
  scored_count: number;
  personalized_count: number;
  pending_count: number;
  sent_count: number;
  clicked_count: number;
  paid_count: number;
  failed_count: number;
  error_message: string | null;
  created_at: string;
  finished_at: string | null;
};

type LogRow = {
  id: string;
  run_id: string;
  step: string;
  status: string;
  message: string | null;
  payload: any;
  created_at: string;
};

type AlertRow = {
  id: string;
  severity: string;
  title: string;
  message: string | null;
  missing_component: string | null;
  suggested_fix: string | null;
  resolved: boolean;
  created_at: string;
};

const STATUS_STYLE: Record<string, string> = {
  completed: "bg-emerald-500/15 text-emerald-400 border-emerald-500/40",
  waiting_approval: "bg-amber-500/15 text-amber-400 border-amber-500/40",
  dry_run_completed: "bg-amber-500/15 text-amber-400 border-amber-500/40",
  blocked: "bg-red-500/15 text-red-400 border-red-500/40",
  failed: "bg-red-500/15 text-red-400 border-red-500/40",
  running: "bg-blue-500/15 text-blue-400 border-blue-500/40",
  queued: "bg-blue-500/15 text-blue-400 border-blue-500/40",
};

const LOG_ICON: Record<string, JSX.Element> = {
  failed: <XCircle className="h-3.5 w-3.5 text-red-400" />,
  sent: <Send className="h-3.5 w-3.5 text-emerald-400" />,
  approved: <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />,
  info: <Info className="h-3.5 w-3.5 text-blue-400" />,
};

export default function PageAdminAutopilotRunDetail() {
  const { runId } = useParams<{ runId: string }>();
  const navigate = useNavigate();
  const [run, setRun] = useState<RunRow | null>(null);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [testEmail, setTestEmail] = useState("");

  const fetchAll = async () => {
    if (!runId) return;
    const [{ data: r }, { data: l }, { data: a }] = await Promise.all([
      supabase.from("autopilot_runs").select("*").eq("id", runId).maybeSingle(),
      supabase.from("outbound_run_logs" as any).select("*").eq("run_id", runId).order("created_at", { ascending: false }).limit(200),
      supabase.from("outbound_admin_alerts" as any).select("*").eq("run_id", runId).order("created_at", { ascending: false }),
    ]);
    setRun((r as any) ?? null);
    setLogs((l as any) ?? []);
    setAlerts((a as any) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
    const ch = supabase
      .channel(`run-detail-${runId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "autopilot_runs", filter: `id=eq.${runId}` }, () => fetchAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "outbound_run_logs", filter: `run_id=eq.${runId}` }, () => fetchAll())
      .subscribe();
    const t = setInterval(fetchAll, 8000);
    return () => { supabase.removeChannel(ch); clearInterval(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId]);

  const call = async (fn: string, body: any, successMsg: string) => {
    setBusy(fn);
    try {
      const { data, error } = await supabase.functions.invoke(fn, { body });
      if (error || (data as any)?.error) throw new Error(error?.message ?? (data as any)?.error);
      toast.success(successMsg);
      fetchAll();
    } catch (e: any) {
      toast.error(e.message ?? "Erreur");
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!run) {
    return (
      <div className="min-h-screen p-6 bg-background">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Retour
        </Button>
        <Card className="p-8 text-center">
          <AlertCircle className="h-8 w-8 mx-auto text-red-400 mb-2" />
          <p className="text-muted-foreground">Run introuvable</p>
        </Card>
      </div>
    );
  }

  const canApprove = ["dry_run_completed", "waiting_approval"].includes(run.status);
  const canRetry = ["blocked", "failed"].includes(run.status);
  const hasProspects = run.personalized_count > 0;

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <Helmet>
        <title>Run {runId?.slice(0, 8)} · Autopilot · UNPRO</title>
      </Helmet>
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate("/admin/autopilot-mvp")} className="h-8 px-2">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              <span className="truncate">{run.trade} · {run.cities.join(", ")}</span>
            </h1>
            <p className="text-xs text-muted-foreground">
              Run {runId?.slice(0, 8)} · {new Date(run.created_at).toLocaleString("fr-CA")}
              {run.dry_run && " · DRY-RUN"}
            </p>
          </div>
          <Badge variant="outline" className={STATUS_STYLE[run.status] ?? ""}>
            {run.status}
          </Badge>
        </div>

        {/* Summary stats */}
        <Card className="p-4">
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3 text-center">
            <Stat label="Cible" value={run.target_count ?? run.target_limit ?? 0} />
            <Stat label="Scrapés" value={run.scraped_count ?? 0} />
            <Stat label="Enrichis" value={run.enriched_count ?? 0} />
            <Stat label="Scorés" value={run.scored_count ?? 0} />
            <Stat label="Personnalisés" value={run.personalized_count ?? 0} />
            <Stat label="En attente" value={run.pending_count ?? 0} />
            <Stat label="Envoyés" value={run.sent_count ?? 0} />
            <Stat label="Clics" value={run.clicked_count ?? 0} />
            <Stat label="Payés" value={run.paid_count ?? 0} />
            <Stat label="Erreurs" value={run.failed_count ?? 0} />
            <Stat label="Dern. étape" value={run.last_step ?? "—"} valueClass="text-sm" />
            <Stat label="Mode" value={run.dry_run ? "Dry-run" : "Live"} valueClass="text-sm" />
          </div>
          {run.next_action && (
            <div className="mt-3 text-xs text-muted-foreground">→ {run.next_action}</div>
          )}
          {run.block_reason && (
            <div className="mt-3 rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
              ⚠ {run.block_reason}
            </div>
          )}
        </Card>

        {/* Actions */}
        <Card className="p-4 space-y-3">
          <h2 className="text-sm font-semibold">Actions</h2>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={busy !== null || !canRetry}
              onClick={() => call("retry-outbound-run", { run_id: runId }, "Retry lancé")}
            >
              {busy === "retry-outbound-run" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Retry (même mode)
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busy !== null || !canRetry}
              onClick={() => call("retry-outbound-run", { run_id: runId, force_live: true }, "Retry live lancé")}
            >
              {busy === "retry-outbound-run" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Retry live
            </Button>
            <Button
              size="sm"
              disabled={busy !== null || !canApprove}
              onClick={() => call("approve-outbound-run", { run_id: runId }, "Run approuvé")}
            >
              {busy === "approve-outbound-run" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
              Approuver
            </Button>
            <Button
              size="sm"
              variant="default"
              disabled={busy !== null || !canApprove}
              onClick={() => call("approve-outbound-run", { run_id: runId, relaunch_live: true }, "Approuvé + relance live")}
            >
              {busy === "approve-outbound-run" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
              Approuver + Live
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-border/50">
            <div className="flex-1">
              <Label className="text-xs">Email de test</Label>
              <Input
                type="email"
                placeholder="admin@unpro.ca"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="h-9"
              />
            </div>
            <Button
              size="sm"
              variant="outline"
              className="self-end"
              disabled={busy !== null || !hasProspects}
              onClick={() => call("send-outbound-test", { run_id: runId, recipient_email: testEmail }, "Test envoyé")}
            >
              {busy === "send-outbound-test" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Envoyer un test
            </Button>
          </div>
          {!hasProspects && (
            <p className="text-xs text-muted-foreground">
              Aucun email personnalisé disponible pour ce run.
            </p>
          )}
        </Card>

        {/* Alerts */}
        {alerts.length > 0 && (
          <Card className="p-4 space-y-2">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-400" /> Alertes ({alerts.length})
            </h2>
            {alerts.map((a) => (
              <div key={a.id} className={`rounded-md border p-3 text-xs ${a.resolved ? "border-border/50 bg-muted/30" : "border-red-500/40 bg-red-500/10"}`}>
                <div className="flex items-center justify-between">
                  <span className="font-medium">{a.title}</span>
                  <Badge variant="outline" className="text-[10px]">{a.severity}</Badge>
                </div>
                {a.message && <p className="text-muted-foreground mt-1">{a.message}</p>}
                {a.suggested_fix && <p className="text-emerald-400 mt-1">→ {a.suggested_fix}</p>}
              </div>
            ))}
          </Card>
        )}

        {/* Logs timeline */}
        <Card className="p-4">
          <h2 className="text-sm font-semibold flex items-center gap-2 mb-3">
            <Clock className="h-4 w-4" /> Timeline ({logs.length})
          </h2>
          {logs.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">Aucun log pour ce run.</p>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
                <div key={log.id} className="flex items-start gap-3 p-2 rounded-md hover:bg-muted/30 border-l-2 border-border/40">
                  <div className="pt-0.5">
                    {LOG_ICON[log.status] ?? <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-medium">{log.step}</span>
                      <Badge variant="outline" className="text-[10px] py-0">{log.status}</Badge>
                      <span className="text-[10px] text-muted-foreground ml-auto">
                        {new Date(log.created_at).toLocaleTimeString("fr-CA")}
                      </span>
                    </div>
                    {log.message && <p className="text-xs text-muted-foreground mt-1">{log.message}</p>}
                    {log.payload && Object.keys(log.payload).length > 0 && (
                      <details className="mt-1">
                        <summary className="text-[10px] text-muted-foreground cursor-pointer hover:text-foreground">payload</summary>
                        <pre className="text-[10px] mt-1 p-2 bg-muted/40 rounded overflow-x-auto">
                          {JSON.stringify(log.payload, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value, valueClass }: { label: string; value: number | string; valueClass?: string }) {
  return (
    <div className="rounded-md bg-muted/30 p-2">
      <div className="text-[10px] text-muted-foreground uppercase">{label}</div>
      <div className={`font-semibold ${valueClass ?? "text-lg"}`}>{value}</div>
    </div>
  );
}
