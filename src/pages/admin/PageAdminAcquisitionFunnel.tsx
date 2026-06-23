import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type FunnelRow = {
  current_stage: string;
  count: number;
};

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

const STAGES = ["scraped", "contacted", "delivered", "opened", "clicked", "registered", "onboarded", "paid", "active"];

export default function PageAdminAcquisitionFunnel() {
  const [running, setRunning] = useState(false);
  const [funnel, setFunnel] = useState<Record<string, number>>({});
  const [findings, setFindings] = useState<Finding[]>([]);
  const [latestRun, setLatestRun] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data: states } = await (supabase as any)
      .from("acquisition_funnel_state")
      .select("current_stage")
      .limit(5000);
    const counts: Record<string, number> = {};
    (states ?? []).forEach((r: any) => {
      counts[r.current_stage] = (counts[r.current_stage] ?? 0) + 1;
    });
    setFunnel(counts);

    const { data: f } = await (supabase as any)
      .from("acquisition_findings")
      .select("*")
      .eq("status", "open")
      .order("lost_revenue_cad", { ascending: false })
      .limit(20);
    setFindings(f ?? []);

    const { data: runs } = await (supabase as any)
      .from("acquisition_audit_runs")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(1);
    setLatestRun(runs?.[0] ?? null);

    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const runAudit = async () => {
    setRunning(true);
    try {
      const { error } = await supabase.functions.invoke("acquisition-pipeline-audit", { body: {} });
      if (error) throw error;
      toast.success("Audit terminé");
      await load();
    } catch (e: any) {
      const detail = e?.context?.body || e?.message || "Erreur audit";
      toast.error(typeof detail === "string" ? detail : JSON.stringify(detail));
    } finally {
      setRunning(false);
    }
  };

  const total = STAGES.reduce((s, st) => s + (funnel[st] ?? 0), 0);
  const stageCount = (s: string) => funnel[s] ?? 0;
  const pct = (s: string) => total ? Math.round((stageCount(s) / total) * 100) : 0;

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

        {latestRun && (() => {
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
        })()}

        {latestRun && (
          <Card className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
              <div><div className="text-muted-foreground text-xs">Dernier audit</div><div className="font-medium">{new Date(latestRun.started_at).toLocaleString("fr-CA")}</div></div>
              <div><div className="text-muted-foreground text-xs">Audités</div><div className="font-medium">{latestRun.contractors_audited}</div></div>
              <div><div className="text-muted-foreground text-xs">Fuites détectées</div><div className="font-medium">{latestRun.findings_created}</div></div>
              <div><div className="text-muted-foreground text-xs">Revenu perdu</div><div className="font-medium text-destructive">{Math.round(latestRun.total_lost_revenue_cad ?? 0)} $</div></div>
              <div><div className="text-muted-foreground text-xs">Récupérable</div><div className="font-medium text-emerald-600">{Math.round(latestRun.total_recoverable_cad ?? 0)} $</div></div>
            </div>
          </Card>
        )}

        {latestRun?.silent_failures && Array.isArray(latestRun.silent_failures) && latestRun.silent_failures.length > 0 && (
          <Card className="p-4 border-red-500/40 bg-red-500/5">
            <h2 className="text-sm font-semibold mb-3 text-red-300">⚠ Silent failures détectés</h2>
            <div className="space-y-2">
              {(latestRun.silent_failures as any[]).map((sf, i) => (
                <div key={i} className="text-sm border-l-2 border-red-500 pl-3 py-1">
                  <div className="font-mono text-xs text-red-300">{sf.code}</div>
                  <div>{sf.description}</div>
                  <div className="text-xs text-muted-foreground mt-1">→ {sf.recommended_action}</div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {latestRun?.data_availability && (
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
                  {Object.entries(latestRun.data_availability as Record<string, any>).map(([t, v]) => (
                    <tr key={t} className="border-b border-border/50">
                      <td className="py-2 pr-3 font-mono text-xs">{t}</td>
                      <td className="py-2 pr-3 text-right">{v.rows}</td>
                      <td className="py-2 pr-3 text-xs text-muted-foreground">{v.last_at ? new Date(v.last_at).toLocaleString("fr-CA") : "—"}</td>
                      <td className="py-2 pr-3">
                        <Badge variant={v.status === "healthy" ? "secondary" : v.status === "warning" ? "default" : "destructive"}>
                          {v.status === "healthy" ? "✓ Connected" : v.status === "warning" ? "⚠ Low" : "✗ No data"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {latestRun?.event_counts && (
          <Card className="p-4">
            <h2 className="text-sm font-semibold mb-3">Event Validation — par stage</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
              {Object.entries(latestRun.event_counts as Record<string, any>).map(([stage, v]) => (
                <div key={stage} className={`p-3 rounded-lg border ${v.total === 0 ? "border-red-500/40 bg-red-500/5" : "border-emerald-500/30 bg-emerald-500/5"}`}>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">{stage}</div>
                  <div className="text-lg font-semibold">{v.total} events</div>
                  <div className="text-xs text-muted-foreground">Last: {v.last_at ? new Date(v.last_at).toLocaleString("fr-CA") : "never"}</div>
                  <div className={`text-xs mt-1 font-medium ${v.total === 0 ? "text-red-300" : "text-emerald-300"}`}>
                    {v.total === 0 ? "Critical" : "Healthy"}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}


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

        <Card className="p-4">
          <h2 className="text-sm font-semibold mb-4">Top 20 fuites par revenu perdu</h2>
          {loading ? (
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
                      <td className="py-2 pr-3 text-right text-destructive">{Math.round(f.lost_revenue_cad)} $</td>
                      <td className="py-2 pr-3 text-right text-emerald-600">{Math.round(f.recoverable_revenue_cad)} $</td>
                      <td className="py-2 pr-3 text-center">{f.auto_repairable ? "✓" : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
