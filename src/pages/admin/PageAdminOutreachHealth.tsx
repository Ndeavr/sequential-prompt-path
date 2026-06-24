/**
 * UNPRO — Outreach Health Cockpit
 * Canonical funnel: Sent → Delivered → Opened → Clicked → Replied
 * Gates autopilot dispatch until acq-e2e-selftest passes within 24h.
 */
import { useState } from "react";
import { Loader2, PlayCircle, ShieldAlert, ShieldCheck, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  useOutreachFunnel, useAutopilotGate, useRecentE2ERuns,
  useRecentEmailEvents, useRunSelftest, useRun30dBackfill,
} from "@/hooks/useOutreachHealth";

const fmt = (n: number | null | undefined) => (n ?? 0).toLocaleString("fr-CA");
const pct = (num: number, den: number) => (den > 0 ? `${Math.round((num / den) * 100)}%` : "—");

export default function PageAdminOutreachHealth() {
  const funnel = useOutreachFunnel();
  const gate = useAutopilotGate();
  const runs = useRecentE2ERuns(5);
  const events = useRecentEmailEvents(100);
  const selftest = useRunSelftest();
  const backfill = useRun30dBackfill();
  const [testEmail, setTestEmail] = useState("");

  const lastPass = gate.data?.last_pass_at ? new Date(gate.data.last_pass_at) : null;
  const freshPass = lastPass ? (Date.now() - lastPass.getTime() < 24 * 3600 * 1000) : false;
  const open = !gate.data?.gated && freshPass;

  const totals = (funnel.data ?? []).reduce((acc, r) => {
    acc.sent += Number(r.sent || 0);
    acc.delivered += Number(r.delivered || 0);
    acc.opened += Number(r.opened || 0);
    acc.clicked += Number(r.clicked || 0);
    acc.replied += Number(r.replied || 0);
    acc.converted += Number(r.converted || 0);
    return acc;
  }, { sent: 0, delivered: 0, opened: 0, clicked: 0, replied: 0, converted: 0 });

  const cells = [
    { label: "Envoyés",      value: totals.sent,      ratio: null },
    { label: "Livrés",       value: totals.delivered, ratio: pct(totals.delivered, totals.sent) },
    { label: "Ouverts",      value: totals.opened,    ratio: pct(totals.opened, totals.delivered) },
    { label: "Cliqués",      value: totals.clicked,   ratio: pct(totals.clicked, totals.delivered) },
    { label: "Répondus",     value: totals.replied,   ratio: pct(totals.replied, totals.delivered) },
    { label: "Convertis",    value: totals.converted, ratio: pct(totals.converted, totals.sent) },
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
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Outreach Health</h1>
          <p className="text-sm text-muted-foreground">Funnel canonique de bout en bout. Bloque l'auto-pilote tant qu'un test E2E n'est pas passé dans les 24h.</p>
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

        {/* Funnel cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
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
                  <tr><th className="text-left py-2">Campagne</th><th>Canal</th><th>Sent</th><th>Delivered</th><th>Opened</th><th>Clicked</th><th>Replied</th><th>Converted</th><th>Bounced</th></tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {(funnel.data ?? []).map((r, i) => (
                    <tr key={i} className="text-right tabular-nums">
                      <td className="text-left py-2">{r.campaign_id}</td>
                      <td><Badge variant="outline">{r.channel}</Badge></td>
                      <td>{fmt(r.sent)}</td><td>{fmt(r.delivered)}</td><td>{fmt(r.opened)}</td>
                      <td>{fmt(r.clicked)}</td><td>{fmt(r.replied)}</td><td>{fmt(r.converted)}</td><td>{fmt(r.bounced)}</td>
                    </tr>
                  ))}
                  {!funnel.data?.length && (
                    <tr><td colSpan={9} className="py-6 text-center text-muted-foreground">Aucune donnée. Lance le selftest ou le backfill.</td></tr>
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
