/**
 * /admin/system-health — Phase 1 cockpit.
 * Live probe of Google Places, Twilio, Stripe, Resend, Edge Functions.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import DashboardLayout from "@/layouts/DashboardLayout";
import { Button } from "@/components/ui/button";
import { runHealthProbe, loadActiveAlerts, resolveAlert, sendDirectSms, type HealthProbe } from "@/services/systemHealthService";
import { useState } from "react";

function fmt(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "à l'instant";
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h} h`;
  return d.toLocaleString("fr-CA");
}

function StatusPill({ ok, code }: { ok: boolean; code?: string }) {
  return (
    <span className={`text-[10px] uppercase rounded-full px-2 py-0.5 font-semibold ${ok ? "bg-emerald-500/15 text-emerald-500" : "bg-destructive/15 text-destructive"}`}>
      {ok ? "PASS" : code || "FAIL"}
    </span>
  );
}

function Card({ title, ok, code, message, children }: { title: string; ok: boolean; code?: string; message?: string; children?: React.ReactNode }) {
  return (
    <div className={`rounded-2xl border p-4 space-y-3 ${ok ? "border-border/40 bg-card/40" : "border-destructive/50 bg-destructive/5"}`}>
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{title}</h3>
        <StatusPill ok={ok} code={code} />
      </div>
      {!ok && message && <div className="text-xs text-destructive whitespace-pre-wrap">{message}</div>}
      <div className="text-xs space-y-1">{children}</div>
    </div>
  );
}

export default function PageSystemHealth() {
  const qc = useQueryClient();
  const probe = useQuery({ queryKey: ["sh-probe"], queryFn: runHealthProbe, refetchInterval: 60_000 });
  const alerts = useQuery({ queryKey: ["sh-alerts"], queryFn: loadActiveAlerts, refetchInterval: 30_000 });
  const [testPhone, setTestPhone] = useState("+15142499522");
  const [testResult, setTestResult] = useState<any>(null);
  const testSms = useMutation({
    mutationFn: () => sendDirectSms(testPhone, `UNPRO test SMS ${new Date().toLocaleTimeString("fr-CA")}`),
    onSuccess: (d) => setTestResult(d),
    onError: (e: any) => setTestResult({ error: String(e?.message ?? e) }),
  });
  const clear = useMutation({
    mutationFn: (id: string) => resolveAlert(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sh-alerts"] }),
  });

  const p = probe.data as HealthProbe | undefined;

  return (
    <DashboardLayout>
      <Helmet><title>System Health — UNPRO</title></Helmet>
      <div className="admin-theme min-h-screen p-6 space-y-6">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">System Health</h1>
            <p className="text-sm text-muted-foreground">Statut temps réel de Google Places, Twilio, Stripe, Resend et Edge Functions. Dernière sonde : {fmt(p?.probed_at)}</p>
          </div>
          <Button size="sm" onClick={() => probe.refetch()} disabled={probe.isFetching}>{probe.isFetching ? "Sonde…" : "Sonder maintenant"}</Button>
        </header>

        {p && !p.google.ok && p.google.code === "REQUEST_DENIED" && (
          <div className="rounded-2xl border-2 border-destructive bg-destructive/10 p-4">
            <div className="text-destructive font-bold text-sm">🔴 CRITIQUE — Google Places clé invalide (REQUEST_DENIED)</div>
            <div className="text-xs mt-1">Aucun scraping ne s'exécute. Mets à jour <code>GOOGLE_PLACES_API_KEY</code> dans les secrets Cloud puis redéploie.</div>
          </div>
        )}

        {(alerts.data ?? []).length > 0 && (
          <section>
            <h2 className="text-sm font-semibold mb-2 uppercase tracking-wider">Alertes actives</h2>
            <div className="rounded-2xl border border-border/40 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/30 text-xs uppercase">
                  <tr><th className="p-2 text-left">Source</th><th className="p-2 text-left">Code</th><th className="p-2 text-left">Message</th><th className="p-2 text-left">When</th><th className="p-2"></th></tr>
                </thead>
                <tbody>
                  {alerts.data!.map((a) => (
                    <tr key={a.id} className="border-t border-border/20">
                      <td className="p-2 text-xs font-mono">{a.source} <span className={`ml-1 text-[10px] uppercase ${a.severity === "critical" ? "text-destructive" : "text-amber-500"}`}>{a.severity}</span></td>
                      <td className="p-2 text-xs font-mono">{a.code}</td>
                      <td className="p-2 text-xs">{a.message}</td>
                      <td className="p-2 text-xs text-muted-foreground">{fmt(a.created_at)}</td>
                      <td className="p-2 text-right"><Button size="sm" variant="ghost" onClick={() => clear.mutate(a.id)}>Résoudre</Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card title="Google Places" ok={!!p?.google.ok} code={p?.google.code} message={p?.google.message}>
            <div>Statut : {p?.google.code ?? "—"}</div>
            <div>Résultats renvoyés (test) : {p?.google.detail?.results ?? "—"}</div>
          </Card>
          <Card title="Twilio" ok={!!p?.twilio.ok} code={p?.twilio.code} message={p?.twilio.message}>
            <div>Account SID : <span className="font-mono">{p?.twilio.detail?.account_sid ?? "—"}</span></div>
            <div>Messaging Service : <span className="font-mono">{p?.twilio.detail?.messaging_service_sid ?? "—"}</span></div>
            <div>From : <span className="font-mono">{p?.twilio.detail?.from_number ?? "—"}</span></div>
            <div>Dernier SMS envoyé : {fmt(p?.sms_metrics.last_sent_at)}</div>
            <div>Dernier SMS livré : {fmt(p?.sms_metrics.last_delivered_at)}</div>
            <div className="pt-2 flex gap-2 items-center">
              <input value={testPhone} onChange={(e) => setTestPhone(e.target.value)} className="text-xs rounded border border-border/40 bg-background px-2 py-1 flex-1" />
              <Button size="sm" variant="secondary" disabled={testSms.isPending} onClick={() => testSms.mutate()}>{testSms.isPending ? "…" : "Envoyer test SMS"}</Button>
            </div>
            {testResult && <pre className="text-[10px] whitespace-pre-wrap">{JSON.stringify(testResult, null, 2)}</pre>}
          </Card>
          <Card title="Stripe" ok={!!p?.stripe.ok} code={p?.stripe.code} message={p?.stripe.message}>
            <div>Mode : {p?.stripe.detail?.livemode ? "LIVE" : "TEST"}</div>
            <div>Balance : {(p?.stripe.detail?.available ?? []).map((a: any) => `${(a.amount / 100).toFixed(2)} ${a.currency.toUpperCase()}`).join(", ") || "—"}</div>
          </Card>
          <Card title="Resend" ok={!!p?.resend.ok} code={p?.resend.code} message={p?.resend.message}>
            <div>Domaines : {(p?.resend.detail?.domains ?? []).length}</div>
            {(p?.resend.detail?.domains ?? []).map((d: any) => (
              <div key={d.name} className="font-mono">{d.name} — <span className={d.status === "verified" ? "text-emerald-500" : "text-amber-500"}>{d.status}</span></div>
            ))}
          </Card>
        </div>

        <section>
          <h2 className="text-lg font-semibold mb-3">Edge Functions — 24 h</h2>
          <div className="rounded-2xl border border-border/40 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs uppercase"><tr><th className="p-2 text-left">Function</th><th className="p-2 text-right">Runs</th><th className="p-2 text-right">Success rate</th><th className="p-2 text-left">Last run</th><th className="p-2 text-left">Last error</th></tr></thead>
              <tbody>
                {(p?.edge_functions.rows ?? []).length === 0 && <tr><td colSpan={5} className="p-4 text-center text-xs text-muted-foreground">Aucun événement platform_operation_outcomes.</td></tr>}
                {(p?.edge_functions.rows ?? []).map((r) => (
                  <tr key={r.operation} className="border-t border-border/20">
                    <td className="p-2 text-xs font-mono">{r.operation}</td>
                    <td className="p-2 text-right tabular-nums">{r.total}</td>
                    <td className={`p-2 text-right tabular-nums ${r.success_rate < 0.9 ? "text-destructive" : "text-emerald-500"}`}>{(r.success_rate * 100).toFixed(0)}%</td>
                    <td className="p-2 text-xs text-muted-foreground">{fmt(r.last_at)}</td>
                    <td className="p-2 text-xs text-destructive">{r.last_error ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
