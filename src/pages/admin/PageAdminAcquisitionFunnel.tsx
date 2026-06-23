import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import SectionErrorBoundary from "@/components/admin/SectionErrorBoundary";

type Finding = {
  id: string;
  phase: string;
  severity: string;
  issue_code: string;
  issue_description: string;
  lost_revenue_cad: number;
  recoverable_revenue_cad: number;
  repair_difficulty: number;
  auto_repairable: boolean;
  status: string;
  contractor_id: string | null;
};

type QueryState<T> = { data: T; error: string | null; loading: boolean };

const STAGES = ["scraped", "contacted", "delivered", "opened", "clicked", "registered", "onboarded", "paid", "active"];

const fmtDate = (v: any): string => {
  if (!v) return "—";
  try { return new Date(v).toLocaleString("fr-CA"); } catch { return "—"; }
};

const errToMsg = (e: any): string => {
  if (!e) return "Erreur";
  if (typeof e === "string") return e;
  if (e.code === "42P01") return `Table absente (${e.message ?? "42P01"})`;
  if (e.code === "42501") return `Permission refusée (${e.message ?? "42501"})`;
  return e.message ?? JSON.stringify(e);
};

export default function PageAdminAcquisitionFunnel() {
  const [running, setRunning] = useState(false);
  const [funnelQ, setFunnelQ] = useState<QueryState<Record<string, number>>>({ data: {}, error: null, loading: true });
  const [findingsQ, setFindingsQ] = useState<QueryState<Finding[]>>({ data: [], error: null, loading: true });
  const [runQ, setRunQ] = useState<QueryState<any | null>>({ data: null, error: null, loading: true });

  const loadFunnel = useCallback(async () => {
    setFunnelQ((s) => ({ ...s, loading: true, error: null }));
    try {
      const { data, error } = await (supabase as any)
        .from("acquisition_funnel_state")
        .select("current_stage")
        .limit(5000);
      if (error) throw error;
      const counts: Record<string, number> = {};
      (data ?? []).forEach((r: any) => {
        if (r?.current_stage) counts[r.current_stage] = (counts[r.current_stage] ?? 0) + 1;
      });
      setFunnelQ({ data: counts, error: null, loading: false });
    } catch (e: any) {
      setFunnelQ({ data: {}, error: errToMsg(e), loading: false });
    }
  }, []);

  const loadFindings = useCallback(async () => {
    setFindingsQ((s) => ({ ...s, loading: true, error: null }));
    try {
      const { data, error } = await (supabase as any)
        .from("acquisition_findings")
        .select("*")
        .eq("status", "open")
        .order("lost_revenue_cad", { ascending: false })
        .limit(20);
      if (error) throw error;
      setFindingsQ({ data: (data ?? []) as Finding[], error: null, loading: false });
    } catch (e: any) {
      setFindingsQ({ data: [], error: errToMsg(e), loading: false });
    }
  }, []);

  const loadRun = useCallback(async () => {
    setRunQ((s) => ({ ...s, loading: true, error: null }));
    try {
      const { data, error } = await (supabase as any)
        .from("acquisition_audit_runs")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(1);
      if (error) throw error;
      setRunQ({ data: data?.[0] ?? null, error: null, loading: false });
    } catch (e: any) {
      setRunQ({ data: null, error: errToMsg(e), loading: false });
    }
  }, []);

  const loadAll = useCallback(() => {
    void loadFunnel();
    void loadFindings();
    void loadRun();
  }, [loadFunnel, loadFindings, loadRun]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const runAudit = async () => {
    setRunning(true);
    try {
      const { error } = await supabase.functions.invoke("acquisition-pipeline-audit", { body: {} });
      if (error) throw error;
      toast.success("Audit terminé");
      loadAll();
    } catch (e: any) {
      const detail = e?.context?.body || e?.message || "Erreur audit";
      toast.error(typeof detail === "string" ? detail : JSON.stringify(detail));
    } finally {
      setRunning(false);
    }
  };

  const funnel = funnelQ.data;
  const latestRun = runQ.data;
  const findings = findingsQ.data;
  const total = STAGES.reduce((s, st) => s + (funnel[st] ?? 0), 0);
  const stageCount = (s: string) => funnel[s] ?? 0;
  const pct = (s: string) => total ? Math.round((stageCount(s) / total) * 100) : 0;

  const ErrorCard = ({ label, msg, onRetry }: { label: string; msg: string; onRetry: () => void }) => (
    <Card className="p-4 border-amber-500/40 bg-amber-500/5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-amber-200">Source indisponible — {label}</div>
          <div className="text-xs text-muted-foreground mt-1 font-mono break-words">{msg}</div>
        </div>
        <Button size="sm" variant="outline" onClick={onRetry}>Réessayer</Button>
      </div>
    </Card>
  );

  return (
    <div className="admin-theme min-h-screen bg-background text-foreground p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Funnel d'acquisition</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Scraping → Contact → Click → Inscription → Paiement → Activation
            </p>
          </div>
          <Button onClick={runAudit} disabled={running}>
            {running ? "Audit en cours…" : "Lancer l'audit"}
          </Button>
        </header>

        {/* ── Status banner ────────────────────────────────── */}
        <SectionErrorBoundary title="Statut système" onRetry={loadRun}>
          {runQ.error ? (
            <ErrorCard label="Audit runs" msg={runQ.error} onRetry={loadRun} />
          ) : latestRun ? (() => {
            const conf = latestRun.confidence_score ?? 0;
            const status = (latestRun.system_status ?? "unknown") as string;
            const tone =
              status === "healthy" ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-300" :
              status === "warning" ? "bg-amber-500/10 border-amber-500/40 text-amber-300" :
              "bg-red-500/10 border-red-500/40 text-red-300";
            const label =
              status === "healthy" ? "VERIFIED" :
              status === "warning" ? "PARTIAL VISIBILITY" :
              status === "critical" ? "CRITICAL" : "UNKNOWN";
            const msg = conf < 50
              ? "Télémétrie d'acquisition insuffisante. Le système ne peut pas déterminer si des fuites existent. Vérifier : Scraper, Tracking, Twilio, Resend, Stripe, Event Pipeline."
              : conf < 95
                ? "Visibilité partielle — certaines sources de données sont muettes."
                : "Funnel verrouillé. Aucune fuite télémétrique détectée.";
            return (
              <Card className={`p-4 border-2 ${tone}`}>
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <div className="text-xs uppercase tracking-widest opacity-80">Statut système</div>
                    <div className="text-2xl font-bold mt-1">{label} · {conf}%</div>
                  </div>
                  <div className="text-sm max-w-2xl opacity-90">{msg}</div>
                </div>
              </Card>
            );
          })() : !runQ.loading ? (
            <Card className="p-4 text-sm text-muted-foreground">
              Aucun audit exécuté. Cliquez « Lancer l'audit ».
            </Card>
          ) : null}
        </SectionErrorBoundary>

        {/* ── Audit summary ────────────────────────────────── */}
        {latestRun && (
          <SectionErrorBoundary title="Résumé audit" onRetry={loadRun}>
            <Card className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                <div><div className="text-muted-foreground text-xs">Dernier audit</div><div className="font-medium">{fmtDate(latestRun.started_at)}</div></div>
                <div><div className="text-muted-foreground text-xs">Audités</div><div className="font-medium">{latestRun.contractors_audited ?? 0}</div></div>
                <div><div className="text-muted-foreground text-xs">Fuites détectées</div><div className="font-medium">{latestRun.findings_created ?? 0}</div></div>
                <div><div className="text-muted-foreground text-xs">Revenu perdu</div><div className="font-medium text-destructive">{Math.round(latestRun.total_lost_revenue_cad ?? 0)} $</div></div>
                <div><div className="text-muted-foreground text-xs">Récupérable</div><div className="font-medium text-emerald-600">{Math.round(latestRun.total_recoverable_cad ?? 0)} $</div></div>
              </div>
            </Card>
          </SectionErrorBoundary>
        )}

        {/* ── Silent failures ──────────────────────────────── */}
        {Array.isArray(latestRun?.silent_failures) && latestRun.silent_failures.length > 0 && (
          <SectionErrorBoundary title="Silent failures" onRetry={loadRun}>
            <Card className="p-4 border-red-500/40 bg-red-500/5">
              <h2 className="text-sm font-semibold mb-3 text-red-300">⚠ Silent failures détectés</h2>
              <div className="space-y-2">
                {(latestRun.silent_failures as any[]).map((sf, i) => (
                  <div key={i} className="text-sm border-l-2 border-red-500 pl-3 py-1">
                    <div className="font-mono text-xs text-red-300">{sf?.code ?? "—"}</div>
                    <div>{sf?.description ?? "—"}</div>
                    {sf?.recommended_action && (
                      <div className="text-xs text-muted-foreground mt-1">→ {sf.recommended_action}</div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          </SectionErrorBoundary>
        )}

        {/* ── Data availability ────────────────────────────── */}
        {latestRun?.data_availability && typeof latestRun.data_availability === "object" && (
          <SectionErrorBoundary title="Data Availability" onRetry={loadRun}>
            <Card className="p-4">
              <h2 className="text-sm font-semibold mb-3">Data Availability</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground border-b border-border">
                      <th className="py-2 pr-3">Table</th>
                      <th className="py-2 pr-3 text-right">Rows</th>
                      <th className="py-2 pr-3">Dernière entrée</th>
                      <th className="py-2 pr-3">Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(latestRun.data_availability as Record<string, any>).map(([t, v]) => {
                      const row = (v ?? {}) as any;
                      return (
                        <tr key={t} className="border-b border-border/50">
                          <td className="py-2 pr-3 font-mono text-xs">{t}</td>
                          <td className="py-2 pr-3 text-right">{row.rows ?? 0}</td>
                          <td className="py-2 pr-3 text-xs text-muted-foreground">{fmtDate(row.last_at)}</td>
                          <td className="py-2 pr-3">
                            <Badge variant={row.status === "healthy" ? "secondary" : row.status === "warning" ? "default" : "destructive"}>
                              {row.status === "healthy" ? "✓ Connected" : row.status === "warning" ? "⚠ Low" : "✗ No data"}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </SectionErrorBoundary>
        )}

        {/* ── Event validation ─────────────────────────────── */}
        {latestRun?.event_counts && typeof latestRun.event_counts === "object" && (
          <SectionErrorBoundary title="Event Validation" onRetry={loadRun}>
            <Card className="p-4">
              <h2 className="text-sm font-semibold mb-3">Event Validation — par stage</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                {Object.entries(latestRun.event_counts as Record<string, any>).map(([stage, v]) => {
                  const ev = (v ?? {}) as any;
                  const totalEv = ev.total ?? 0;
                  return (
                    <div key={stage} className={`p-3 rounded-lg border ${totalEv === 0 ? "border-red-500/40 bg-red-500/5" : "border-emerald-500/30 bg-emerald-500/5"}`}>
                      <div className="text-xs uppercase tracking-wide text-muted-foreground">{stage}</div>
                      <div className="text-lg font-semibold">{totalEv} events</div>
                      <div className="text-xs text-muted-foreground">Last: {ev.last_at ? fmtDate(ev.last_at) : "never"}</div>
                      <div className={`text-xs mt-1 font-medium ${totalEv === 0 ? "text-red-300" : "text-emerald-300"}`}>
                        {totalEv === 0 ? "Critical" : "Healthy"}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </SectionErrorBoundary>
        )}

        {/* ── Funnel ───────────────────────────────────────── */}
        <SectionErrorBoundary title="Entonnoir" onRetry={loadFunnel}>
          {funnelQ.error ? (
            <ErrorCard label="Funnel state" msg={funnelQ.error} onRetry={loadFunnel} />
          ) : (
            <Card className="p-4">
              <h2 className="text-sm font-semibold mb-4">Entonnoir — {total} entrepreneurs</h2>
              <div className="space-y-2">
                {STAGES.map((s, i) => {
                  const prev = i > 0 ? stageCount(STAGES[i - 1]) : stageCount(s);
                  const drop = i > 0 && prev > 0 ? Math.round(((prev - stageCount(s)) / prev) * 100) : 0;
                  return (
                    <div key={s} className="flex items-center gap-3">
                      <div className="w-28 text-xs uppercase tracking-wide text-muted-foreground">{s}</div>
                      <div className="flex-1 h-7 bg-muted rounded-md overflow-hidden">
                        <div className="h-full bg-primary/80 flex items-center px-2 text-xs text-primary-foreground transition-all"
                             style={{ width: `${Math.max(pct(s), 2)}%` }}>
                          {stageCount(s)} ({pct(s)}%)
                        </div>
                      </div>
                      {i > 0 && drop > 0 && (
                        <Badge variant="destructive" className="text-xs">-{drop}%</Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </SectionErrorBoundary>

        {/* ── Findings ─────────────────────────────────────── */}
        <SectionErrorBoundary title="Top fuites" onRetry={loadFindings}>
          {findingsQ.error ? (
            <ErrorCard label="Findings" msg={findingsQ.error} onRetry={loadFindings} />
          ) : (
            <Card className="p-4">
              <h2 className="text-sm font-semibold mb-4">Top 20 fuites par revenu perdu</h2>
              {findingsQ.loading ? (
                <div className="text-muted-foreground text-sm">Chargement…</div>
              ) : findings.length === 0 ? (
                <div className="text-muted-foreground text-sm">Aucune fuite ouverte. Lancez un audit.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground border-b border-border">
                        <th className="py-2 pr-3">Phase</th>
                        <th className="py-2 pr-3">Sévérité</th>
                        <th className="py-2 pr-3">Problème</th>
                        <th className="py-2 pr-3 text-right">Perdu</th>
                        <th className="py-2 pr-3 text-right">Récupérable</th>
                        <th className="py-2 pr-3 text-center">Auto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {findings.map((f) => (
                        <tr key={f.id} className="border-b border-border/50">
                          <td className="py-2 pr-3 text-xs">{f.phase}</td>
                          <td className="py-2 pr-3">
                            <Badge variant={f.severity === "critical" ? "destructive" : f.severity === "high" ? "default" : "secondary"}>
                              {f.severity}
                            </Badge>
                          </td>
                          <td className="py-2 pr-3">{f.issue_description}</td>
                          <td className="py-2 pr-3 text-right text-destructive">{Math.round(f.lost_revenue_cad ?? 0)} $</td>
                          <td className="py-2 pr-3 text-right text-emerald-600">{Math.round(f.recoverable_revenue_cad ?? 0)} $</td>
                          <td className="py-2 pr-3 text-center">{f.auto_repairable ? "✓" : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}
        </SectionErrorBoundary>
      </div>
    </div>
  );
}
