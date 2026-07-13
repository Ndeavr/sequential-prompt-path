/**
 * SmsHealthPanel — Canonical live status for SMS outbound infrastructure.
 * Reads `get_sms_outbound_health()` RPC. Displays masked SID/phone,
 * valid_until, 5-min test cooldown, exact block cause + 1-click test.
 */
import { useEffect, useState } from "react";
import { Activity, CheckCircle2, AlertTriangle, XCircle, PlayCircle, Loader2 } from "lucide-react";
import {
  useSmsHealth,
  useRunSmsTest,
  maskPhone,
  maskSid,
  type SmsHealthStatus,
} from "@/hooks/useSmsHealth";

const STATUS_META: Record<SmsHealthStatus, { label: string; cls: string; ring: string; Icon: typeof CheckCircle2 }> = {
  HEALTHY: { label: "Opérationnel", cls: "text-emerald-300",  ring: "border-emerald-400/40 bg-emerald-500/10", Icon: CheckCircle2 },
  WARNING: { label: "Attention",    cls: "text-amber-300",    ring: "border-amber-400/40 bg-amber-500/10",     Icon: AlertTriangle },
  ERROR:   { label: "Bloqué",       cls: "text-rose-300",     ring: "border-rose-400/40 bg-rose-500/10",       Icon: XCircle },
};

function fmt(dt: string | null): string {
  if (!dt) return "—";
  return new Date(dt).toLocaleString("fr-CA", { dateStyle: "short", timeStyle: "short" });
}

function useCooldownTicker(initialMs: number) {
  const [remaining, setRemaining] = useState(initialMs);
  useEffect(() => {
    setRemaining(initialMs);
    if (initialMs <= 0) return;
    const id = setInterval(() => {
      setRemaining((r) => Math.max(0, r - 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [initialMs]);
  return remaining;
}

export default function SmsHealthPanel() {
  const { data, isLoading } = useSmsHealth();
  const runTest = useRunSmsTest();
  const cooldownRemaining = useCooldownTicker(data?.cooldownMs ?? 0);

  if (isLoading || !data) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-sm text-slate-400">
        Chargement de l'état SMS…
      </div>
    );
  }

  const h = data.health;
  const meta = STATUS_META[h.status] ?? STATUS_META.ERROR;
  const StatusIcon = meta.Icon;
  const cooldownSec = Math.ceil(cooldownRemaining / 1000);
  const cooldownActive = cooldownRemaining > 0;

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
              <span className="text-xs uppercase tracking-wider text-slate-400">Twilio Outbound Status</span>
              <span className={`text-xs font-semibold ${meta.cls}`}>· {meta.label}</span>
            </div>
            <h3 className="text-lg font-semibold text-white mt-0.5">
              {h.is_operational
                ? "Le canal SMS est prêt à envoyer."
                : "Le canal SMS bloque les envois de batch."}
            </h3>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1">
          <button
            disabled={runTest.isPending || cooldownActive}
            onClick={() => runTest.mutate(undefined)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-slate-950 text-sm font-semibold hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {runTest.isPending
              ? <><Loader2 className="h-4 w-4 animate-spin" />Envoi test…</>
              : <><PlayCircle className="h-4 w-4" />Tester maintenant</>}
          </button>
          {cooldownActive && (
            <span className="text-[10px] text-slate-400">
              Prochain test dans {cooldownSec}s
            </span>
          )}
        </div>
      </div>

      {h.reason && (
        <div className="rounded-lg border border-white/10 bg-black/20 p-3 text-sm text-slate-200">
          <div className="text-xs uppercase tracking-wider text-slate-400 mb-1">Cause du blocage</div>
          {h.reason}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        <Metric label="Dernier callback Twilio" value={fmt(h.last_callback_at)} />
        <Metric label="Dernier test livré" value={fmt(h.last_test_success_at)} />
        <Metric label="Valide jusqu'à" value={fmt(h.valid_until)} />
        <Metric
          label="Livraison 24h"
          value={h.delivery_rate_24h != null ? `${Number(h.delivery_rate_24h).toFixed(0)}%` : "—"}
          hint={`${h.delivered_24h ?? 0}/${h.sent_24h ?? 0} — ${h.failed_24h ?? 0} échecs`}
        />
      </div>

      {(h.last_test_sid || h.last_test_phone) && (
        <div className="rounded-lg border border-white/10 bg-black/20 p-3 text-xs text-slate-300 space-y-1">
          <div className="text-slate-400 uppercase tracking-wider text-[10px]">Dernier test SMS</div>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <span>Destination : <b className="text-slate-100">{maskPhone(h.last_test_phone)}</b></span>
            <span>Twilio SID : <b className="text-slate-100 font-mono">{maskSid(h.last_test_sid)}</b></span>
          </div>
          {h.last_test_error && <div className="text-rose-300">Erreur : {h.last_test_error}</div>}
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
