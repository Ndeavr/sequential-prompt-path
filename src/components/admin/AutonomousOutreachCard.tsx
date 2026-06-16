/**
 * UNPRO — AutonomousOutreachCard
 * Live counters for the contractor onboarding SMS lifecycle.
 * Reads onboarding_sequences + contractor_onboarding_messages.
 * See mem://standards/production-reliability-framework
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { OperationHealthCard } from "@/components/admin/OperationHealthCard";

type Counts = {
  active: number;
  waiting: number;
  paid: number;
  unsubscribed: number;
  failed: number;
  sentToday: number;
  deliveredToday: number;
  failedToday: number;
  blockedToday: number;
};

const EMPTY: Counts = {
  active: 0, waiting: 0, paid: 0, unsubscribed: 0, failed: 0,
  sentToday: 0, deliveredToday: 0, failedToday: 0, blockedToday: 0,
};

export function AutonomousOutreachCard() {
  const [c, setC] = useState<Counts>(EMPTY);
  const [paused, setPaused] = useState<boolean>(false);
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const iso = startOfDay.toISOString();

    const sb = supabase as any;
    const [seqActive, seqWaiting, seqPaid, seqUnsub, seqFailed, sentT, delivT, failT, blockT, settings] = await Promise.all([
      sb.from("onboarding_sequences").select("id", { count: "exact", head: true }).eq("status", "active"),
      sb.from("onboarding_sequences").select("id", { count: "exact", head: true }).eq("status", "waiting"),
      sb.from("onboarding_sequences").select("id", { count: "exact", head: true }).eq("status", "completed_paid"),
      sb.from("onboarding_sequences").select("id", { count: "exact", head: true }).eq("status", "completed_unsubscribed"),
      sb.from("onboarding_sequences").select("id", { count: "exact", head: true }).eq("status", "failed"),
      sb.from("contractor_onboarding_messages").select("id", { count: "exact", head: true }).gte("created_at", iso).in("status", ["sent", "delivered", "sending"]),
      sb.from("contractor_onboarding_messages").select("id", { count: "exact", head: true }).gte("created_at", iso).eq("status", "delivered"),
      sb.from("contractor_onboarding_messages").select("id", { count: "exact", head: true }).gte("created_at", iso).in("status", ["failed", "undelivered"]),
      sb.from("contractor_onboarding_messages").select("id", { count: "exact", head: true }).gte("created_at", iso).eq("status", "skipped"),
      sb.from("outbound_global_settings").select("outreach_paused").maybeSingle(),
    ]);

    setC({
      active: seqActive.count ?? 0,
      waiting: seqWaiting.count ?? 0,
      paid: seqPaid.count ?? 0,
      unsubscribed: seqUnsub.count ?? 0,
      failed: seqFailed.count ?? 0,
      sentToday: sentT.count ?? 0,
      deliveredToday: delivT.count ?? 0,
      failedToday: failT.count ?? 0,
      blockedToday: blockT.count ?? 0,
    });
    setPaused(Boolean(settings.data?.outreach_paused));
    setLoading(false);
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, []);

  async function runNow() {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("run-contractor-onboarding-worker", { body: {} });
      if (error) throw error;
      toast.success(`Worker exécuté · ${data?.processed ?? 0} séquence(s) traitées`);
      load();
    } catch (e: any) {
      toast.error(`Échec: ${e?.message ?? e}`);
    } finally {
      setRunning(false);
    }
  }

  async function togglePause() {
    const sb = supabase as any;
    const next = !paused;
    const { error } = await sb.from("outbound_global_settings").update({ outreach_paused: next }).neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) {
      toast.error(`Erreur: ${error.message}`);
      return;
    }
    setPaused(next);
    toast.success(next ? "Outreach autonome en pause" : "Outreach autonome réactivé");
  }

  const total = c.active + c.waiting + c.paid + c.unsubscribed + c.failed;
  const nextAction = paused
    ? "Outreach en pause — cliquez Reprendre pour réactiver."
    : c.active === 0 && c.waiting === 0
      ? "Aucune séquence active. Créez ou importez des leads marqués ready_for_outreach."
      : `${c.active} séquence(s) actives · prochain run du worker dans ≤ 5 min.`;

  return (
    <div className="space-y-3">
      <OperationHealthCard
        title="Outreach autonome contracteurs"
        service="SMS · Twilio · Cron */5min"
        metrics={{
          generated: total,
          sent: c.sentToday,
          delivered: c.deliveredToday,
          failed: c.failedToday,
          blocked: c.blockedToday,
        }}
        blockedReason={paused ? "Outreach globalement en pause (outbound_global_settings.outreach_paused)" : undefined}
        nextAction={nextAction}
      />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
        <Stat label="Actives" value={c.active} tone="info" />
        <Stat label="En attente" value={c.waiting} />
        <Stat label="Payés" value={c.paid} tone="ok" />
        <Stat label="Désabonnés" value={c.unsubscribed} />
        <Stat label="Échecs" value={c.failed} tone={c.failed > 0 ? "bad" : undefined} />
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button size="sm" onClick={runNow} disabled={running || loading}>
          {running ? "Exécution…" : "Exécuter le worker maintenant"}
        </Button>
        <Button size="sm" variant={paused ? "default" : "outline"} onClick={togglePause} disabled={loading}>
          {paused ? "Reprendre l'outreach" : "Mettre l'outreach en pause"}
        </Button>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "ok" | "info" | "bad" }) {
  const cls =
    tone === "ok" ? "text-emerald-300" :
    tone === "info" ? "text-sky-300" :
    tone === "bad" ? "text-rose-300" : "text-foreground";
  return (
    <div className="rounded-md border border-border/40 bg-muted/20 px-2 py-1.5">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`text-sm font-semibold tabular-nums ${cls}`}>{value}</div>
    </div>
  );
}

export default AutonomousOutreachCard;
