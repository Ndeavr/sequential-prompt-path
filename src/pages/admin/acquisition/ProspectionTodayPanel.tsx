/**
 * Prospection aujourd'hui — panneau opérationnel temps réel.
 * Données de production uniquement : aucun compteur simulé, aucun état inféré.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, PlayCircle, RefreshCw, Stethoscope } from "lucide-react";

const FREE_TARGET = 10;

type Metrics = {
  discovered: number;
  verified: number;
  contactable: number;
  attempted: number;
  delivered: number;
  failed: number;
  clicked: number;
  signupStarted: number;
  otpVerified: number;
  activated: number;
  blockedCompliance: number;
};

type CycleRow = {
  created_at: string;
  reason_code: string | null;
  metadata: Record<string, unknown> | null;
};

type AgentRow = {
  name: string;
  lastRun: string | null;
  lastSuccess: string | null;
  processed: number | null;
  output: string;
  lastError: string | null;
  state: "HEALTHY" | "BLOCKED" | "IDLE" | "DISABLED";
};

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString("fr-CA") : "—");

export default function ProspectionTodayPanel() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [cycles, setCycles] = useState<CycleRow[]>([]);
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [outreachEnabled, setOutreachEnabled] = useState<boolean | null>(null);
  const [diagnostic, setDiagnostic] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const today = startOfToday();
    const head = { count: "exact" as const, head: true };

    const [
      discovered, verified, contactable, attempted, delivered, failed, clicked,
      blocked, events, activatedRes, cycleRes, agentLogRes, flagRes,
    ] = await Promise.all([
      supabase.from("verified_contractor_prospects").select("id", head).gte("created_at", today),
      supabase.from("verified_contractor_prospects").select("id", head).eq("verification_status", "verified"),
      supabase.from("verified_contractor_prospects").select("id", head).eq("verification_status", "verified").eq("outreach_status", "none"),
      supabase.from("verified_contractor_prospects").select("id", head).gte("outreach_sent_at", today),
      supabase.from("verified_contractor_prospects").select("id", head).gte("outreach_delivered_at", today),
      supabase.from("verified_contractor_prospects").select("id", head).eq("outreach_status", "failed"),
      supabase.from("verified_contractor_prospects").select("id", head).gte("outreach_clicked_at", today),
      supabase.from("verified_contractor_prospects").select("id", head).not("rejection_reason_code", "is", null),
      supabase.from("contractor_funnel_events").select("event_type").gte("created_at", today),
      supabase.from("founder_memberships").select("id", head).eq("status", "founder_activated"),
      supabase.from("acquisition_pipeline_events").select("created_at,reason_code,metadata").eq("stage", "worker_cycle").order("created_at", { ascending: false }).limit(12),
      supabase.from("agent_logs").select("agent_name,message,created_at,log_type").order("created_at", { ascending: false }).limit(30),
      supabase.from("system_flags").select("key,value").eq("key", "OUTREACH_ENABLED").maybeSingle(),
    ]);

    const eventTypes = (events.data ?? []).map((e: { event_type: string }) => e.event_type);
    const countEvt = (t: string) => eventTypes.filter((e) => e === t).length;

    setMetrics({
      discovered: discovered.count ?? 0,
      verified: verified.count ?? 0,
      contactable: contactable.count ?? 0,
      attempted: attempted.count ?? 0,
      delivered: delivered.count ?? 0,
      failed: failed.count ?? 0,
      clicked: clicked.count ?? 0,
      signupStarted: countEvt("registration_started") + countEvt("founder_signup_started"),
      otpVerified: countEvt("otp_verified"),
      activated: activatedRes.count ?? 0,
      blockedCompliance: blocked.count ?? 0,
    });

    const cycleRows = (cycleRes.data ?? []) as CycleRow[];
    setCycles(cycleRows);
    setOutreachEnabled(flagRes.data ? Boolean((flagRes.data as { value: unknown }).value) : null);

    // ---- État des agents, uniquement d'après des preuves d'exécution --------
    const sentInCycle = (c: CycleRow) => Number((c.metadata as any)?.send_tally?.sent ?? 0);
    const lastCycle = cycleRows[0] ?? null;
    const lastSendingCycle = cycleRows.find((c) => sentInCycle(c) > 0) ?? null;
    const logs = (agentLogRes.data ?? []) as Array<{ agent_name: string; message: string; created_at: string; log_type: string }>;
    const loopLog = logs.find((l) => l.agent_name === "autonomy-loop") ?? null;

    setAgents([
      {
        name: "acquisition-queue-worker",
        lastRun: lastCycle?.created_at ?? null,
        lastSuccess: lastSendingCycle?.created_at ?? null,
        processed: lastCycle ? Number((lastCycle.metadata as any)?.send_tally?.processed ?? 0) : null,
        output: lastCycle ? `${sentInCycle(lastCycle)} envoi(s) sur ${Number((lastCycle.metadata as any)?.send_tally?.processed ?? 0)} traité(s)` : "aucune exécution enregistrée",
        lastError: lastCycle?.reason_code ?? null,
        state: !lastCycle ? "IDLE" : sentInCycle(lastCycle) > 0 ? "HEALTHY" : "BLOCKED",
      },
      {
        name: "autonomy-loop",
        lastRun: loopLog?.created_at ?? null,
        lastSuccess: loopLog && loopLog.log_type !== "error" ? loopLog.created_at : null,
        processed: null,
        output: loopLog?.message ?? "aucune exécution enregistrée",
        lastError: loopLog?.log_type === "error" ? loopLog.message : null,
        state: !loopLog ? "IDLE" : loopLog.log_type === "error" ? "BLOCKED" : "HEALTHY",
      },
    ]);

    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const runCycle = async () => {
    setRunning("cycle");
    const { error } = await supabase.functions.invoke("acquisition-queue-worker", {
      body: { limit: 10, free_only: true, offer: "free_year" },
    });
    setRunning(null);
    if (error) toast({ title: "Cycle non terminé", description: error.message, variant: "destructive" });
    else toast({ title: "Cycle lancé", description: "Les résultats réels apparaissent ci-dessous." });
    await load();
  };

  const diagnose = async () => {
    setRunning("diag");
    setDiagnostic(null);
    const { data, error } = await supabase.functions.invoke("acquisition-queue-worker", {
      body: { dry_run: true, limit: 25 },
    });
    setRunning(null);
    if (error) { setDiagnostic(`Diagnostic impossible : ${error.message}`); return; }
    const counts = (data as any)?.counts ?? {};
    setDiagnostic(
      `Candidats: ${counts.matched ?? 0} · déjà contactés: ${counts.historically_excluded ?? 0} · `
      + `vérification réutilisée: ${counts.verification_reused ?? 0} · vérification requise: ${counts.lookup_required ?? 0}`,
    );
  };

  const attempted = metrics?.attempted ?? 0;
  const verdict = outreachEnabled === false
    ? { label: "PROSPECTION BLOQUÉE", cause: "L'envoi global est désactivé (OUTREACH_ENABLED).", action: "Réactiver l'envoi global.", tone: "bg-red-500/15 text-red-300 border-red-500/40" }
    : attempted > 0
      ? { label: "LES AGENTS PROSPECTENT", cause: `${attempted} entreprise(s) contactée(s) aujourd'hui.`, action: "Poursuivre jusqu'à 10 activations.", tone: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40" }
      : { label: "AUCUNE PROSPECTION CONFIRMÉE", cause: "Aucun envoi réel enregistré aujourd'hui.", action: "Lancer un cycle et lire le résultat ci-dessous.", tone: "bg-amber-500/15 text-amber-300 border-amber-500/40" };

  const tiles: Array<[string, number]> = metrics ? [
    ["Découvertes", metrics.discovered],
    ["Vérifiées", metrics.verified],
    ["Contactables", metrics.contactable],
    ["Contacts tentés", metrics.attempted],
    ["Livrés", metrics.delivered],
    ["Échecs", metrics.failed],
    ["Clics", metrics.clicked],
    ["Inscriptions", metrics.signupStarted],
    ["Codes vérifiés", metrics.otpVerified],
    ["Bloqués conformité", metrics.blockedCompliance],
  ] : [];

  return (
    <section className="space-y-4">
      <Card className={`p-4 border ${verdict.tone}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-lg font-semibold tracking-tight">{verdict.label}</div>
            <p className="text-sm opacity-90">{verdict.cause}</p>
            <p className="text-xs opacity-75 mt-1">Action : {verdict.action}</p>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase opacity-70">Activations gratuites</div>
            <div className="text-3xl font-bold">{metrics?.activated ?? 0} / {FREE_TARGET}</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          <Button size="sm" onClick={runCycle} disabled={!!running}>
            {running === "cycle" ? <Loader2 className="size-4 mr-2 animate-spin" /> : <PlayCircle className="size-4 mr-2" />}
            Lancer un cycle maintenant
          </Button>
          <Button size="sm" variant="outline" onClick={diagnose} disabled={!!running}>
            {running === "diag" ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Stethoscope className="size-4 mr-2" />}
            Diagnostiquer
          </Button>
          <Button size="sm" variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className="size-4 mr-2" />Rafraîchir
          </Button>
        </div>
        {diagnostic && <p className="text-xs mt-3 opacity-90">{diagnostic}</p>}
      </Card>

      <Card className="p-4">
        <h2 className="text-lg font-semibold mb-3">Prospection aujourd'hui</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {tiles.map(([label, value]) => (
            <div key={label} className="rounded-lg border border-border/60 p-3 min-w-0">
              <div className="text-[11px] text-muted-foreground truncate">{label}</div>
              <div className="text-xl font-bold">{value}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="text-lg font-semibold mb-3">État des agents</h2>
        <div className="space-y-2">
          {agents.map((a) => (
            <div key={a.name} className="rounded-lg border border-border/60 p-3 text-sm min-w-0">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="font-medium break-all">{a.name}</span>
                <Badge variant="outline" className="text-[10px]">{a.state}</Badge>
              </div>
              <div className="text-xs text-muted-foreground mt-1">Dernière exécution : {fmt(a.lastRun)}</div>
              <div className="text-xs text-muted-foreground">Dernier succès d'envoi : {fmt(a.lastSuccess)}</div>
              <div className="text-xs mt-1 break-words">{a.output}</div>
              {a.lastError && <div className="text-xs text-amber-400 mt-1 break-words">Dernier signal : {a.lastError}</div>}
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="text-lg font-semibold mb-3">Journal des cycles</h2>
        <div className="space-y-1 max-h-64 overflow-auto text-xs">
          {cycles.length === 0 && <div className="text-muted-foreground">Aucun cycle enregistré.</div>}
          {cycles.map((c, i) => {
            const t = (c.metadata as any)?.send_tally ?? {};
            return (
              <div key={`${c.created_at}-${i}`} className="border-b border-border/30 py-1 flex flex-wrap gap-2">
                <span className="text-muted-foreground">{fmt(c.created_at)}</span>
                <span>traités {t.processed ?? 0}</span>
                <span className="text-emerald-400">envoyés {t.sent ?? 0}</span>
                <span className="text-amber-400">ignorés {t.skipped ?? 0}</span>
                <span className="text-red-400">échecs {t.failed ?? 0}</span>
                {c.reason_code && <span className="text-muted-foreground break-all">{c.reason_code}</span>}
              </div>
            );
          })}
        </div>
      </Card>
    </section>
  );
}
