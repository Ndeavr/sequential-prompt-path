/**
 * UNPRO — Outreach Health Cockpit
 * Canonical funnel: Sent → Delivered → Opened → Clicked → Replied
 * Gates autopilot dispatch until acq-e2e-selftest passes within 24h.
 */
import { useState } from "react";
import { Loader2, PlayCircle, ShieldAlert, ShieldCheck, RefreshCcw, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  useOutreachFunnel, useAutopilotGate, useRecentE2ERuns, useProviderHealth,
  useRecentEmailEvents, useRunSelftest, useRun30dBackfill,
  useOperationalScore, useActiveHealthChecks, useRepairRuns, useCriticalAlerts,
  useE2EFullRuns, useRunHealthAgent, useRunE2EReal, useRepairMessaging,
} from "@/hooks/useOutreachHealth";


const fmt = (n: number | null | undefined) => (n ?? 0).toLocaleString("fr-CA");
const pct = (num: number, den: number) => (den > 0 ? `${Math.round((num / den) * 100)}%` : "—");

export default function PageAdminOutreachHealth() {
  const funnel = useOutreachFunnel();
  const gate = useAutopilotGate();
  const runs = useRecentE2ERuns(5);
  const events = useRecentEmailEvents(100);
  const providers = useProviderHealth();
  const selftest = useRunSelftest();
  const backfill = useRun30dBackfill();
  const score = useOperationalScore();
  const healthChecks = useActiveHealthChecks();
  const repairs = useRepairRuns(20);
  const alerts = useCriticalAlerts();
  const e2eFull = useE2EFullRuns(5);
  const runAgent = useRunHealthAgent();
  const runE2E = useRunE2EReal();
  const repairMessaging = useRepairMessaging();
  const [testEmail, setTestEmail] = useState("");
  const [lastE2E, setLastE2E] = useState<null | { pass: boolean; failed_step: any; total_ms: number }>(null);


  const lastPass = gate.data?.last_pass_at ? new Date(gate.data.last_pass_at) : null;
  const freshPass = lastPass ? (Date.now() - lastPass.getTime() < 24 * 3600 * 1000) : false;
  const open = !gate.data?.gated && freshPass;

  const totals = (funnel.data ?? []).reduce((acc, r) => {
    acc.sent += Number(r.sent || 0);
    acc.delivered += Number(r.delivered || 0);
    acc.opened += Number(r.opened || 0);
    acc.clicked += Number(r.clicked || 0);
    acc.replied += Number(r.replied || 0);
    acc.onboarding += Number(r.onboarding_started || 0);
    acc.activated += Number(r.activated || 0);
    acc.paid += Number(r.paid || 0);
    return acc;
  }, { sent: 0, delivered: 0, opened: 0, clicked: 0, replied: 0, onboarding: 0, activated: 0, paid: 0 });

  const cells = [
    { label: "Envoyés",   value: totals.sent,       ratio: null },
    { label: "Livrés",    value: totals.delivered,  ratio: pct(totals.delivered, totals.sent) },
    { label: "Ouverts",   value: totals.opened,     ratio: pct(totals.opened, totals.delivered) },
    { label: "Cliqués",   value: totals.clicked,    ratio: pct(totals.clicked, totals.delivered) },
    { label: "Onboarding",value: totals.onboarding, ratio: pct(totals.onboarding, totals.clicked) },
    { label: "Activés",   value: totals.activated,  ratio: pct(totals.activated, totals.onboarding) },
    { label: "Payés",     value: totals.paid,       ratio: pct(totals.paid, totals.sent) },
  ];

  const handleSelftest = () => {
    selftest.mutate({ email: testEmail || undefined }, {
      onSuccess: (r: any) => {
        if (r?.ok) toast.success(`Selftest passé — gate ouvert pour 24h`);
        else toast.error(`Selftest échoué à : ${r?.failed_step ?? "?"}`);
        gate.refetch(); runs.refetch();
      },
      onError: (e: any) => toast.error(`Erreur selftest : ${e.message}`),
    });
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6 min-w-0">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight break-normal">Outreach Health</h1>
          <p className="text-sm text-muted-foreground break-normal">Funnel canonique de bout en bout. Bloque l'auto-pilote tant qu'un test E2E n'est pas passé dans les 24h.</p>
        </div>

        {/* Autopilot gate banner */}
        <Card className={open ? "border-emerald-500/40 bg-emerald-500/5" : "border-amber-500/40 bg-amber-500/5"}>
          <CardContent className="pt-6 flex items-start gap-4">
            {open ? <ShieldCheck className="h-6 w-6 text-emerald-500 mt-0.5" /> : <ShieldAlert className="h-6 w-6 text-amber-500 mt-0.5" />}
            <div className="flex-1">
              <p className="font-medium">
                {open ? "Auto-pilote OUVERT" : "Auto-pilote FERMÉ — aucun envoi en masse autorisé"}
              </p>
              <p className="text-sm text-muted-foreground">
                {gate.data?.reason ?? "—"} ·{" "}
                {lastPass ? `dernier test passé : ${lastPass.toLocaleString("fr-CA")}` : "aucun test passé"}
              </p>
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="email cible (default founder)"
                value={testEmail}
                onChange={e => setTestEmail(e.target.value)}
                className="w-64"
              />
              <Button onClick={handleSelftest} disabled={selftest.isPending} className="gap-2">
                {selftest.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
                Lancer selftest E2E
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* === ACTIVE HEALTH ENGINE === */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Active Health Engine</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">Probes auto every 15 min. Auto-repair + auto-unlock autopilot.</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => runAgent.mutate(undefined, { onSuccess: () => { healthChecks.refetch(); score.refetch(); repairs.refetch(); alerts.refetch(); gate.refetch(); toast.success("Health agent exécuté"); }, onError: (e: any) => toast.error(e.message) })} disabled={runAgent.isPending}>
                {runAgent.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCcw className="h-3.5 w-3.5" />}
                <span className="ml-1.5 text-xs">Run health agent</span>
              </Button>
              <Button size="sm" onClick={() => runE2E.mutate(undefined, { onSuccess: (r: any) => { e2eFull.refetch(); gate.refetch(); toast[r?.pass ? "success" : "error"](`E2E ${r?.pass ? "PASS" : "FAIL"} (${r?.total_ms}ms)`); }, onError: (e: any) => toast.error(e.message) })} disabled={runE2E.isPending}>
                {runE2E.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PlayCircle className="h-3.5 w-3.5" />}
                <span className="ml-1.5 text-xs">Run real E2E (14 steps)</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Operational score */}
            <div className="grid grid-cols-2 md:grid-cols-8 gap-2 text-center">
              {(["overall","infrastructure","messaging","tracking","payments","automation","conversion","autopilot"] as const).map(k => {
                const v = (score.data?.[k] ?? 0) as number;
                const color = v >= 95 ? "text-emerald-500" : v >= 80 ? "text-amber-500" : "text-red-500";
                return (
                  <div key={k} className="rounded-lg border border-border/40 p-2">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{k}</p>
                    <p className={`text-xl font-semibold tabular-nums ${color}`}>{v}</p>
                  </div>
                );
              })}
            </div>

            {/* Provider status grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {(healthChecks.data ?? []).map((p: any) => {
                const color = p.status === "green" ? "bg-emerald-500" : p.status === "yellow" ? "bg-amber-500" : p.status === "red" ? "bg-red-500" : "bg-slate-400";
                return (
                  <div key={p.provider} className="rounded-lg border border-border/40 p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
                        <span className="text-sm font-medium">{p.provider}</span>
                      </div>
                      <span className="text-[10px] uppercase text-muted-foreground">{p.status}</span>
                    </div>
                    {p.failure_reason && <p className="text-xs text-red-500 mt-1">{p.failure_reason}</p>}
                    {p.message && <p className="text-xs text-muted-foreground mt-1">{p.message}</p>}
                    {p.repair_action && <p className="text-xs text-amber-500 mt-1">→ {p.repair_action}</p>}
                  </div>
                );
              })}
              {!healthChecks.data?.length && <p className="text-xs text-muted-foreground">Aucune probe enregistrée. Lance le health agent.</p>}
            </div>

            {/* Critical alerts */}
            {(alerts.data ?? []).length > 0 && (
              <div className="rounded-lg border border-red-500/40 bg-red-500/5 p-3 space-y-2">
                <p className="text-sm font-medium text-red-500">⚠ Alertes critiques ouvertes</p>
                {(alerts.data as any[]).map((a) => (
                  <div key={a.id} className="text-xs">
                    <span className="font-medium">{a.provider}</span> — {a.root_cause} · repair: {a.repair_progress ?? "—"} · ARR risk: ${(a.revenue_at_risk_cents/100).toFixed(0)}
                  </div>
                ))}
              </div>
            )}

            {/* Repair log */}
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground mb-1.5">Repair runs récents</p>
              <div className="space-y-1 text-xs">
                {(repairs.data ?? []).slice(0, 8).map((r: any) => (
                  <div key={r.id} className="flex items-center justify-between border-b border-border/30 pb-1">
                    <span><Badge variant={r.outcome === "success" ? "default" : "secondary"} className="mr-2">{r.outcome}</Badge>{r.provider} · {r.action}</span>
                    <span className="text-muted-foreground">{r.duration_ms}ms · {new Date(r.created_at).toLocaleTimeString("fr-CA")}</span>
                  </div>
                ))}
                {!repairs.data?.length && <p className="text-muted-foreground">Aucune réparation lancée.</p>}
              </div>
            </div>

            {/* E2E full runs */}
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground mb-1.5">Tests E2E 14 étapes</p>
              <div className="space-y-1 text-xs">
                {(e2eFull.data ?? []).map((r: any) => (
                  <div key={r.id} className="flex items-center justify-between border-b border-border/30 pb-1">
                    <span><Badge variant={r.pass ? "default" : "destructive"} className="mr-2">{r.pass ? "PASS" : "FAIL"}</Badge>{new Date(r.created_at).toLocaleString("fr-CA")}</span>
                    <span className="text-muted-foreground">{r.total_duration_ms}ms</span>
                  </div>
                ))}
                {!e2eFull.data?.length && <p className="text-muted-foreground">Aucun E2E complet exécuté.</p>}
              </div>
            </div>
          </CardContent>
        </Card>



        {/* Provider webhook freshness */}
        <Card>
          <CardHeader><CardTitle className="text-base">Webhooks providers</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {(providers.data ?? []).map((p) => {
                const ts = p.last_event_at ? new Date(p.last_event_at) : null;
                const ageMin = ts ? (Date.now() - ts.getTime()) / 60_000 : Infinity;
                const status = !ts ? "missing" : ageMin < 30 ? "ok" : ageMin < 1440 ? "stale" : "missing";
                const color = status === "ok" ? "bg-emerald-500" : status === "stale" ? "bg-amber-500" : "bg-red-500";
                const label: Record<string,string> = {
                  resend_email: "Resend (email)", twilio_sms: "Twilio (SMS)",
                  r_redirect_clicks: "/r/ clicks", stripe_checkouts: "Stripe",
                };
                return (
                  <div key={p.provider} className="rounded-lg border border-border/40 p-3">
                    <div className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
                      <span className="text-sm font-medium">{label[p.provider] ?? p.provider}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5">
                      {ts ? `Dernier événement : ${ts.toLocaleString("fr-CA")}` : "Aucun événement reçu"}
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Funnel cards */}
        <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
          {cells.map(c => (
            <Card key={c.label}>
              <CardContent className="pt-5">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">{c.label}</p>
                <p className="text-2xl font-semibold tabular-nums mt-1">{fmt(c.value)}</p>
                {c.ratio && <p className="text-xs text-muted-foreground mt-1">{c.ratio}</p>}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* By channel × campaign */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Par canal & campagne</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => backfill.mutate(undefined, { onSuccess: () => { funnel.refetch(); toast.success("Backfill 30j terminé"); } })} disabled={backfill.isPending}>
              {backfill.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCcw className="h-3.5 w-3.5" />}
              <span className="ml-1.5 text-xs">Backfill 30j</span>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground uppercase">
                  <tr><th className="text-left py-2">Campagne</th><th>Canal</th><th>Sent</th><th>Delivered</th><th>Opened</th><th>Clicked</th><th>Onboard</th><th>Activated</th><th>Paid</th><th>Bounced</th></tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {(funnel.data ?? []).map((r, i) => (
                    <tr key={i} className="text-right tabular-nums">
                      <td className="text-left py-2">{r.campaign_id}</td>
                      <td><Badge variant="outline">{r.channel}</Badge></td>
                      <td>{fmt(r.sent)}</td><td>{fmt(r.delivered)}</td><td>{fmt(r.opened)}</td>
                      <td>{fmt(r.clicked)}</td><td>{fmt(r.onboarding_started)}</td>
                      <td>{fmt(r.activated)}</td><td>{fmt(r.paid)}</td><td>{fmt(r.bounced)}</td>
                    </tr>
                  ))}
                  {!funnel.data?.length && (
                    <tr><td colSpan={10} className="py-6 text-center text-muted-foreground">Aucune donnée. Lance le selftest ou le backfill.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Recent E2E runs */}
        <Card>
          <CardHeader><CardTitle className="text-base">Tests E2E récents</CardTitle></CardHeader>
          <CardContent>
            {(runs.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun test exécuté.</p>
            ) : (
              <div className="space-y-2">
                {(runs.data ?? []).map((r: any) => (
                  <div key={r.id} className="flex items-center justify-between text-sm border-b border-border/40 pb-2">
                    <div>
                      <Badge variant={r.status === "passed" ? "default" : r.status === "failed" ? "destructive" : "secondary"}>{r.status}</Badge>
                      <span className="ml-2 text-muted-foreground">{new Date(r.created_at).toLocaleString("fr-CA")}</span>
                      {r.failed_step && <span className="ml-2 text-amber-500">étape échouée : {r.failed_step}</span>}
                    </div>
                    <span className="text-xs text-muted-foreground">{r.duration_ms ? `${r.duration_ms}ms` : "—"}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent emails */}
        <Card>
          <CardHeader><CardTitle className="text-base">100 derniers emails</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-muted-foreground">
                  <tr><th className="text-left py-2">Sujet</th><th className="text-left">Destinataire</th><th>Sent</th><th>Deliv</th><th>Open</th><th>Click</th><th>Reply</th></tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {(events.data ?? []).map((e: any) => (
                    <tr key={e.id}>
                      <td className="py-1.5 truncate max-w-[280px]">{e.subject ?? e.template ?? e.message_id}</td>
                      <td className="truncate max-w-[200px]">{e.recipient}</td>
                      <td className="text-center">{e.sent_at ? "✓" : ""}</td>
                      <td className="text-center">{e.delivered_at ? "✓" : ""}</td>
                      <td className="text-center">{e.opened_at ? "✓" : ""}</td>
                      <td className="text-center">{e.clicked_at ? "✓" : ""}</td>
                      <td className="text-center">{e.replied_at ? "✓" : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
