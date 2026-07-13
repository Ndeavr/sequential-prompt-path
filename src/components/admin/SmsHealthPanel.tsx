/**
 * SmsHealthPanel — Displays live SMS outbound infrastructure status
 * with exact block cause and 1-click test button.
 */
import { Activity, CheckCircle2, AlertTriangle, XCircle, PlayCircle, Loader2 } from "lucide-react";
import { useSmsHealth, useRunSmsTest, type SmsHealthStatus } from "@/hooks/useSmsHealth";

const STATUS_META: Record<SmsHealthStatus, { label: string; cls: string; ring: string; Icon: typeof CheckCircle2 }> = {
  HEALTHY: { label: "Opérationnel", cls: "text-emerald-300",  ring: "border-emerald-400/40 bg-emerald-500/10", Icon: CheckCircle2 },
  WARNING: { label: "Attention",    cls: "text-amber-300",    ring: "border-amber-400/40 bg-amber-500/10",     Icon: AlertTriangle },
  ERROR:   { label: "Bloqué",       cls: "text-rose-300",     ring: "border-rose-400/40 bg-rose-500/10",       Icon: XCircle },
};

function fmt(dt: string | null): string {
  if (!dt) return "—";
  return new Date(dt).toLocaleString("fr-CA", { dateStyle: "short", timeStyle: "short" });
}

export default function SmsHealthPanel() {
  const { data, isLoading } = useSmsHealth();
  const runTest = useRunSmsTest();

  if (isLoading || !data) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-sm text-slate-400">
        Chargement de l'état SMS…
      </div>
    );
  }

  const meta = STATUS_META[data.status.status];
  const StatusIcon = meta.Icon;
  const last = data.lastTest;

  return (
    <div className={`rounded-2xl border ${meta.ring} p-5 space-y-4`}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg bg-white/5 ${meta.cls}`}>
            <StatusIcon className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-slate-400" />
              <span className="text-xs uppercase tracking-wider text-slate-400">SMS Outbound</span>
              <span className={`text-xs font-semibold ${meta.cls}`}>· {meta.label}</span>
            </div>
            <h3 className="text-lg font-semibold text-white mt-0.5">
              {data.status.status === "HEALTHY"
                ? "Le canal SMS est prêt à envoyer."
                : "Le canal SMS bloque les envois de batch."}
            </h3>
          </div>
        </div>

        <button
          disabled={runTest.isPending}
          onClick={() => runTest.mutate(undefined)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-slate-950 text-sm font-semibold hover:bg-slate-100 disabled:opacity-50"
        >
          {runTest.isPending
            ? <><Loader2 className="h-4 w-4 animate-spin" />Envoi test…</>
            : <><PlayCircle className="h-4 w-4" />Exécuter un test SMS</>}
        </button>
      </div>

      {data.blockReason && (
        <div className="rounded-lg border border-white/10 bg-black/20 p-3 text-sm text-slate-200">
          <div className="text-xs uppercase tracking-wider text-slate-400 mb-1">Cause du blocage</div>
          {data.blockReason}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        <Metric label="Dernier callback Twilio" value={fmt(data.status.last_callback_at)} />
        <Metric label="Dernier test réussi" value={fmt(data.status.last_test_success_at)} />
        <Metric
          label="Livraison 24 h"
          value={data.status.delivery_rate_24h != null ? `${data.status.delivery_rate_24h}%` : "—"}
          hint={`${data.status.delivered_24h ?? 0}/${data.status.sent_24h ?? 0}`}
        />
        <Metric label="Échecs 24 h" value={`${data.status.failed_24h ?? 0}`} />
      </div>

      {last && (
        <div className="rounded-lg border border-white/10 bg-black/20 p-3 text-xs text-slate-300 space-y-1">
          <div className="text-slate-400 uppercase tracking-wider text-[10px]">Dernier test SMS</div>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <span>Numéro : <b className="text-slate-100">{last.phone}</b></span>
            <span>Twilio SID : <b className="text-slate-100">{last.message_sid ?? "—"}</b></span>
            <span>Envoyé : {fmt(last.sent_at ?? last.created_at)}</span>
            <span>Callback : {last.callback_received ? <b className="text-emerald-300">reçu</b> : <b className="text-amber-300">en attente</b>}</span>
            <span>Statut : {last.success ? <b className="text-emerald-300">succès</b> : last.failed_at ? <b className="text-rose-300">échec</b> : <b className="text-amber-300">en cours</b>}</span>
          </div>
          {last.error && <div className="text-rose-300">Erreur : {last.error}</div>}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg bg-black/20 border border-white/10 p-3">
      <div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className="text-sm font-semibold text-slate-100 mt-0.5">{value}</div>
      {hint && <div className="text-[10px] text-slate-500 mt-0.5">{hint}</div>}
    </div>
  );
}
