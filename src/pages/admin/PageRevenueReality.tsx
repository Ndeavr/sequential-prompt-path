/**
 * /admin/revenue-reality — production truth cockpit.
 * Only real numbers, from real tables. Zero vanity metrics.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Helmet } from "react-helmet-async";
import DashboardLayout from "@/layouts/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  loadFunnel, loadTopBlockers, loadRecentSms, loadRecentCheckouts,
  triggerEmergencyBlast,
} from "@/services/revenueRealityService";
import { runHealthProbe, loadRevenueTruth, computeCriticalBlockers } from "@/services/systemHealthService";

function fmt(iso: string | null): string {
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

export default function PageRevenueReality() {
  const qc = useQueryClient();
  const funnel = useQuery({ queryKey: ["rr-funnel"], queryFn: loadFunnel, refetchInterval: 30_000 });
  const blockers = useQuery({ queryKey: ["rr-blockers"], queryFn: loadTopBlockers, refetchInterval: 30_000 });
  const sms = useQuery({ queryKey: ["rr-sms"], queryFn: () => loadRecentSms(25), refetchInterval: 30_000 });
  const checkouts = useQuery({ queryKey: ["rr-checkouts"], queryFn: () => loadRecentCheckouts(25), refetchInterval: 60_000 });
  const probe = useQuery({ queryKey: ["rr-probe"], queryFn: runHealthProbe, refetchInterval: 120_000 });
  const truth = useQuery({ queryKey: ["rr-truth"], queryFn: loadRevenueTruth, refetchInterval: 60_000 });
  const smsStep = (funnel.data ?? []).find((s) => s.key === "sms_sent");
  const validMobileStep = (funnel.data ?? []).find((s) => s.key === "valid_mobile");
  const blockersLive = useQuery({
    queryKey: ["rr-critical", probe.data?.probed_at, smsStep?.count_24h, validMobileStep?.count_total],
    queryFn: () => computeCriticalBlockers(probe.data ?? null, (smsStep?.count_24h ?? 0) > 0, validMobileStep?.count_total ?? 0),
    enabled: !!probe.data && !!funnel.data,
  });

  const [dryRun, setDryRun] = useState(true);
  const [blastResult, setBlastResult] = useState<any>(null);
  const blast = useMutation({
    mutationFn: () => triggerEmergencyBlast(dryRun),
    onSuccess: (data) => {
      setBlastResult(data);
      qc.invalidateQueries({ queryKey: ["rr-sms"] });
      qc.invalidateQueries({ queryKey: ["rr-funnel"] });
    },
    onError: (err: any) => setBlastResult({ error: String(err?.message ?? err) }),
  });

  return (
    <DashboardLayout>
      <Helmet><title>Revenue Reality — UNPRO</title></Helmet>
      <div className="admin-theme min-h-screen p-6 space-y-8">
        <header className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold">Revenue Reality</h1>
            <p className="text-sm text-muted-foreground">Scrape → Valid mobile → SMS → Delivery → Click → Onboarding → Checkout → Paid. Real data only.</p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs flex items-center gap-2 text-muted-foreground">
              <input type="checkbox" checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} />
              Dry-run
            </label>
            <Button size="sm" variant={dryRun ? "outline" : "destructive"} disabled={blast.isPending} onClick={() => blast.mutate()}>
              {blast.isPending ? "Envoi…" : dryRun ? "Simuler 25 SMS" : "Envoyer 25 SMS RÉELS"}
            </Button>
          </div>
        </header>

        {blastResult && (
          <pre className="rounded-2xl border border-border/40 bg-card/40 p-4 text-xs overflow-x-auto">
            {JSON.stringify(blastResult, null, 2)}
          </pre>
        )}

        {/* CRITICAL BLOCKERS — top of page */}
        <section>
          <h2 className="text-lg font-semibold mb-3">Critical Blockers</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(blockersLive.data ?? []).length === 0 && !blockersLive.isFetching && (
              <div className="text-xs text-muted-foreground">Aucun blocage détecté par la sonde.</div>
            )}
            {(blockersLive.data ?? []).map((b) => {
              const dot = b.severity === "critical" ? "🔴" : b.severity === "warning" ? "🟡" : "🟢";
              const border = b.severity === "critical" ? "border-destructive/60 bg-destructive/10"
                : b.severity === "warning" ? "border-amber-500/50 bg-amber-500/10"
                : "border-emerald-500/40 bg-emerald-500/5";
              return (
                <div key={b.key} className={`rounded-2xl border p-3 ${border}`}>
                  <div className="text-sm font-semibold">{dot} {b.label}</div>
                  <div className="text-xs text-muted-foreground mt-1">{b.detail}</div>
                </div>
              );
            })}
          </div>
        </section>

        {/* REVENUE TRUTH LAYER */}
        <section>
          <h2 className="text-lg font-semibold mb-3">Revenue Truth</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-2xl border border-emerald-500/50 bg-emerald-500/10 p-4">
              <div className="text-[10px] uppercase tracking-wider text-emerald-500">Paid</div>
              <div className="text-2xl font-bold tabular-nums">{truth.data?.paid ?? 0}</div>
              <div className="text-xs text-muted-foreground">{truth.data ? `${(truth.data.total_paid_amount_cents / 100).toFixed(2)} $` : "—"}</div>
            </div>
            <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4">
              <div className="text-[10px] uppercase tracking-wider text-amber-500">Pending</div>
              <div className="text-2xl font-bold tabular-nums">{truth.data?.pending ?? 0}</div>
              <div className="text-xs text-muted-foreground">Checkout créé, pas payé</div>
            </div>
            <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-4">
              <div className="text-[10px] uppercase tracking-wider text-destructive">Abandoned</div>
              <div className="text-2xl font-bold tabular-nums">{truth.data?.abandoned ?? 0}</div>
              <div className="text-xs text-muted-foreground">&gt; 24 h sans paiement</div>
            </div>
            <div className="rounded-2xl border border-border/40 bg-card/40 p-4">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Test</div>
              <div className="text-2xl font-bold tabular-nums">{truth.data?.test ?? 0}</div>
              <div className="text-xs text-muted-foreground">Stripe test mode — exclus du revenu</div>
            </div>
          </div>
        </section>

        {/* Funnel */}
        <section>
          <h2 className="text-lg font-semibold mb-3">Funnel réel</h2>
          <div className="rounded-2xl border border-border/40 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left p-3">Étape</th>
                  <th className="text-right p-3">24 h</th>
                  <th className="text-right p-3">Total</th>
                  <th className="text-left p-3">Dernier événement</th>
                  <th className="text-right p-3">Statut</th>
                </tr>
              </thead>
              <tbody>
                {(funnel.data ?? []).map((s) => {
                  const red = s.count_24h === 0;
                  return (
                    <tr key={s.key} className="border-t border-border/20">
                      <td className="p-3">{s.label}</td>
                      <td className="p-3 text-right tabular-nums font-semibold">{s.count_24h}</td>
                      <td className="p-3 text-right tabular-nums text-muted-foreground">{s.count_total}</td>
                      <td className="p-3 text-xs text-muted-foreground">{fmt(s.last_at)}</td>
                      <td className="p-3 text-right">
                        <span className={`text-[10px] uppercase rounded-full px-2 py-0.5 ${red ? "bg-destructive/15 text-destructive" : "bg-success/15 text-success"}`}>
                          {red ? "0 en 24 h" : "actif"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Blockers */}
        <section>
          <h2 className="text-lg font-semibold mb-3">Pourquoi le pipeline est bloqué (24 h)</h2>
          <div className="rounded-2xl border border-border/40 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left p-3">Agent</th>
                  <th className="text-left p-3">Événement</th>
                  <th className="text-left p-3">Message</th>
                  <th className="text-right p-3">Occurrences</th>
                </tr>
              </thead>
              <tbody>
                {(blockers.data ?? []).length === 0 && (
                  <tr><td colSpan={4} className="p-4 text-center text-muted-foreground text-xs">Aucun blocage détecté.</td></tr>
                )}
                {(blockers.data ?? []).map((b, i) => (
                  <tr key={i} className="border-t border-border/20 align-top">
                    <td className="p-3 font-mono text-xs">{b.agent}</td>
                    <td className="p-3 text-xs">{b.event}</td>
                    <td className="p-3 text-xs whitespace-pre-wrap">{b.message}</td>
                    <td className="p-3 text-right tabular-nums">{b.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* SMS */}
        <section>
          <h2 className="text-lg font-semibold mb-3">25 derniers SMS</h2>
          <div className="rounded-2xl border border-border/40 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left p-3">When</th>
                  <th className="text-left p-3">Phone</th>
                  <th className="text-left p-3">Body</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">Twilio SID</th>
                  <th className="text-left p-3">Error</th>
                </tr>
              </thead>
              <tbody>
                {(sms.data ?? []).length === 0 && (
                  <tr><td colSpan={6} className="p-4 text-center text-muted-foreground text-xs">Aucun SMS envoyé.</td></tr>
                )}
                {(sms.data ?? []).map((s) => (
                  <tr key={s.id} className="border-t border-border/20 align-top">
                    <td className="p-3 text-xs whitespace-nowrap text-muted-foreground">{fmt(s.created_at)}</td>
                    <td className="p-3 text-xs font-mono">{s.recipient_phone}</td>
                    <td className="p-3 text-xs max-w-[24rem] truncate">{s.body}</td>
                    <td className="p-3 text-xs">{s.status}</td>
                    <td className="p-3 text-xs font-mono text-muted-foreground">{s.provider_message_id ?? "—"}</td>
                    <td className="p-3 text-xs text-destructive">{s.error ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Checkouts */}
        <section>
          <h2 className="text-lg font-semibold mb-3">Checkouts récents</h2>
          <div className="rounded-2xl border border-border/40 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left p-3">When</th>
                  <th className="text-left p-3">Contractor</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-right p-3">Total</th>
                  <th className="text-left p-3">Stripe ref</th>
                </tr>
              </thead>
              <tbody>
                {(checkouts.data ?? []).length === 0 && (
                  <tr><td colSpan={5} className="p-4 text-center text-muted-foreground text-xs">Aucun checkout.</td></tr>
                )}
                {(checkouts.data ?? []).map((c) => (
                  <tr key={c.id} className="border-t border-border/20">
                    <td className="p-3 text-xs whitespace-nowrap text-muted-foreground">{fmt(c.created_at)}</td>
                    <td className="p-3 text-xs font-mono">{c.contractor_id ?? "—"}</td>
                    <td className="p-3 text-xs">{c.payment_status ?? "—"}</td>
                    <td className="p-3 text-right tabular-nums">{c.amount_total != null ? `${(c.amount_total / 100).toFixed(2)} $` : "—"}</td>
                    <td className="p-3 text-xs font-mono text-muted-foreground">{c.stripe_checkout_reference ?? "—"}</td>
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
