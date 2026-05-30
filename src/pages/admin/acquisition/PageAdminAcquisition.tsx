import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RefreshCw, PlayCircle, Activity, AlertTriangle, CheckCircle2, XCircle, MinusCircle } from "lucide-react";

type HealthRow = { service_name: string; status: string; required_for: string[]; error_message: string | null; last_checked_at: string | null };
type RunRow = { id: string; run_type: string; status: string; started_at: string; completed_at: string | null; succeeded_count: number; failed_count: number; blocked_count: number; error_summary: string | null };
type ProspectRow = { id: string; business_name: string; trade: string | null; city: string | null; aipp_score: number | null; outreach_status: string; onboarding_status: string; payment_status: string; activation_status: string; blocked_reason: string | null };

const STATUS_COLOR: Record<string, string> = {
  connected: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
  limited:   "bg-amber-500/20 text-amber-400 border-amber-500/40",
  missing:   "bg-red-500/20 text-red-400 border-red-500/40",
  invalid:   "bg-red-500/20 text-red-400 border-red-500/40",
  unknown:   "bg-zinc-500/20 text-zinc-400 border-zinc-500/40",
};

const STEP_ICON = { working: <CheckCircle2 className="size-4 text-emerald-400" />, partial: <AlertTriangle className="size-4 text-amber-400" />, blocked: <XCircle className="size-4 text-red-400" />, missing_config: <MinusCircle className="size-4 text-zinc-400" /> } as Record<string, JSX.Element>;

export default function PageAdminAcquisition() {
  const { toast } = useToast();
  const [health, setHealth] = useState<HealthRow[]>([]);
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [prospects, setProspects] = useState<ProspectRow[]>([]);
  const [stats, setStats] = useState({ prospects: 0, aipp: 0, sent: 0, paid: 0, active: 0, blocked: 0 });
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<string | null>(null);
  const [report, setReport] = useState<any[] | null>(null);

  const refresh = async () => {
    setLoading(true);
    const [{ data: h }, { data: r }, { data: p }, { count: cp }, { count: ca }, { count: cpaid }, { count: cact }, { count: cb }] = await Promise.all([
      supabase.from("system_config_health").select("*").order("service_name"),
      supabase.from("acquisition_pipeline_runs").select("*").order("started_at", { ascending: false }).limit(20),
      supabase.from("contractor_prospects").select("id,business_name,trade,city,aipp_score,outreach_status,onboarding_status,payment_status,activation_status,blocked_reason").order("updated_at", { ascending: false }).limit(50),
      supabase.from("contractor_prospects").select("*", { count: "exact", head: true }),
      supabase.from("contractor_prospects").select("*", { count: "exact", head: true }).eq("aipp_status", "generated"),
      supabase.from("contractor_prospects").select("*", { count: "exact", head: true }).eq("payment_status", "paid"),
      supabase.from("contractor_prospects").select("*", { count: "exact", head: true }).eq("activation_status", "active"),
      supabase.from("contractor_prospects").select("*", { count: "exact", head: true }).not("blocked_reason", "is", null),
    ]);
    setHealth((h as HealthRow[]) || []);
    setRuns((r as RunRow[]) || []);
    setProspects((p as ProspectRow[]) || []);
    setStats({ prospects: cp ?? 0, aipp: ca ?? 0, sent: 0, paid: cpaid ?? 0, active: cact ?? 0, blocked: cb ?? 0 });
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const runHealthCheck = async () => {
    setRunning("health");
    const { error } = await supabase.functions.invoke("acq-health-check");
    setRunning(null);
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    await refresh();
  };

  const runFullTest = async () => {
    setRunning("full_test");
    setReport(null);
    const { data, error } = await supabase.functions.invoke("acq-full-test");
    setRunning(null);
    if (error) { toast({ title: "Échec test E2E", description: error.message, variant: "destructive" }); return; }
    setReport(data?.report || []);
    await refresh();
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-6 space-y-6">
      <header className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Acquisition Cockpit</h1>
          <p className="text-sm text-muted-foreground">Pipeline scrape → enrichissement → AIPP → outreach → paiement → activation</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={refresh} disabled={loading}><RefreshCw className="size-4 mr-2" />Rafraîchir</Button>
          <Button variant="outline" onClick={runHealthCheck} disabled={!!running}>{running === "health" ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Activity className="size-4 mr-2" />}Health check</Button>
          <Button onClick={runFullTest} disabled={!!running}>{running === "full_test" ? <Loader2 className="size-4 mr-2 animate-spin" /> : <PlayCircle className="size-4 mr-2" />}Run Full Pipeline Test</Button>
        </div>
      </header>

      {/* Header cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {[
          ["Prospects", stats.prospects],
          ["AIPP générés", stats.aipp],
          ["Outreach envoyés", stats.sent],
          ["Paiements", stats.paid],
          ["Actifs", stats.active],
          ["Bloqués", stats.blocked],
        ].map(([label, val]) => (
          <Card key={label as string} className="p-4">
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className="text-2xl font-bold">{val}</div>
          </Card>
        ))}
      </div>

      {/* Health */}
      <Card className="p-4">
        <h2 className="text-lg font-semibold mb-3">État des services</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {health.map(h => (
            <div key={h.service_name} className={`border rounded-lg p-3 ${STATUS_COLOR[h.status] || STATUS_COLOR.unknown}`}>
              <div className="flex items-center justify-between">
                <div className="font-medium text-sm">{h.service_name}</div>
                <Badge variant="outline" className="text-[10px] uppercase">{h.status}</Badge>
              </div>
              {h.error_message && <div className="text-xs mt-1 opacity-80 line-clamp-2">{h.error_message}</div>}
              <div className="text-[10px] mt-2 opacity-60">requis pour: {h.required_for.join(", ") || "—"}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Pipeline visual */}
      <Card className="p-4">
        <h2 className="text-lg font-semibold mb-3">Pipeline</h2>
        <div className="flex flex-wrap gap-2 items-center text-xs">
          {[
            { k: "Scraping", svc: "google_places" },
            { k: "Enrichment", svc: "firecrawl" },
            { k: "AIPP", svc: "gemini" },
            { k: "Outreach Email", svc: "resend" },
            { k: "Outreach SMS", svc: "twilio" },
            { k: "Checkout", svc: "stripe" },
            { k: "Activation", svc: "stripe_webhook" },
          ].map((s, i) => {
            const h = health.find(x => x.service_name === s.svc);
            const status = h?.status || "unknown";
            return (
              <div key={s.k} className="flex items-center gap-2">
                <div className={`px-3 py-2 rounded-lg border ${STATUS_COLOR[status]}`}>{s.k}</div>
                {i < 6 && <span className="opacity-40">→</span>}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Full test report */}
      {report && (
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-3">Rapport Full Pipeline Test</h2>
          <ul className="space-y-2">
            {report.map((r, i) => (
              <li key={i} className="flex items-start gap-3 border-b border-border/40 pb-2">
                {STEP_ICON[r.status]}
                <div className="flex-1">
                  <div className="text-sm font-medium">{r.step} <span className="text-xs text-muted-foreground">— {r.status}</span></div>
                  <div className="text-xs text-muted-foreground">{r.message}</div>
                  {r.next_action && <div className="text-xs text-amber-400 mt-1">Action: {r.next_action}</div>}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Runs */}
      <Card className="p-4">
        <h2 className="text-lg font-semibold mb-3">Runs récents</h2>
        <div className="space-y-1 max-h-64 overflow-auto text-xs font-mono">
          {runs.map(r => (
            <div key={r.id} className="flex gap-2 items-center border-b border-border/30 py-1">
              <Badge variant="outline" className="text-[10px]">{r.run_type}</Badge>
              <span className={r.status === "succeeded" ? "text-emerald-400" : r.status === "failed" ? "text-red-400" : r.status === "partial" ? "text-amber-400" : "text-muted-foreground"}>{r.status}</span>
              <span className="text-muted-foreground">{new Date(r.started_at).toLocaleString("fr-CA")}</span>
              <span>✓{r.succeeded_count} ✗{r.failed_count} ⏸{r.blocked_count}</span>
              {r.error_summary && <span className="text-red-400 truncate">{r.error_summary}</span>}
            </div>
          ))}
        </div>
      </Card>

      {/* Prospects */}
      <Card className="p-4">
        <h2 className="text-lg font-semibold mb-3">Prospects ({prospects.length})</h2>
        <div className="overflow-auto">
          <table className="w-full text-xs">
            <thead className="text-left text-muted-foreground border-b border-border">
              <tr><th className="p-2">Entreprise</th><th>Métier</th><th>Ville</th><th>AIPP</th><th>Outreach</th><th>Onboarding</th><th>Paiement</th><th>Activation</th><th>Bloqué</th></tr>
            </thead>
            <tbody>
              {prospects.map(p => (
                <tr key={p.id} className="border-b border-border/30">
                  <td className="p-2 font-medium">{p.business_name}</td>
                  <td>{p.trade || "—"}</td><td>{p.city || "—"}</td><td>{p.aipp_score ?? "—"}</td>
                  <td><Badge variant="outline" className="text-[10px]">{p.outreach_status}</Badge></td>
                  <td><Badge variant="outline" className="text-[10px]">{p.onboarding_status}</Badge></td>
                  <td><Badge variant="outline" className="text-[10px]">{p.payment_status}</Badge></td>
                  <td><Badge variant="outline" className="text-[10px]">{p.activation_status}</Badge></td>
                  <td className="text-red-400 truncate max-w-[200px]">{p.blocked_reason || ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
