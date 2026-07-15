import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Activity, AlertTriangle, RefreshCw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import {
  useAcquisitionDeadQueueAlerts,
  useAcquisitionDiagnosticsFunnel,
  useAcquisitionSourceHealth,
  useFirstDollarTracker,
  useLatestAcquisitionAudit,
  useRunDailyAcquisitionAudit,
} from "@/hooks/useAcquisitionFunnel";

function fmt(at?: string | null) {
  return at ? formatDistanceToNow(new Date(at), { addSuffix: true, locale: fr }) : "En attente";
}

export default function PageAdminAcquisitionDiagnostics() {
  const funnel = useAcquisitionDiagnosticsFunnel();
  const sources = useAcquisitionSourceHealth();
  const alerts = useAcquisitionDeadQueueAlerts();
  const tracker = useFirstDollarTracker();
  const audit = useLatestAcquisitionAudit();
  const runAudit = useRunDailyAcquisitionAudit();

  const rootCause = sources.data?.find((s) => s.is_down)?.last_error_message
    ?? alerts.data?.[0]?.reason
    ?? (tracker.data?.next_missing_milestone !== "Scale" ? `Milestone bloqué: ${tracker.data?.next_missing_milestone}` : "Aucun blocage critique actif");

  return (
    <div className="admin-theme min-h-screen bg-[#050816] text-white">
      <div className="mx-auto max-w-6xl p-5 space-y-6">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Acquisition Diagnostics</h1>
            <p className="text-sm text-white/70 mt-1">Funnel revenu — source, validation, outreach, activation, paiement.</p>
          </div>
          <button
            onClick={async () => {
              try {
                await runAudit.mutateAsync();
                toast.success("Audit acquisition exécuté");
              } catch (e: any) {
                toast.error("Audit échoué", { description: e?.message ?? "Erreur inconnue" });
              }
            }}
            className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs flex items-center gap-2 hover:bg-white/[0.08]"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Auditer
          </button>
        </header>

        <section className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-white/50"><ShieldCheck className="w-4 h-4" /> Score santé</div>
            <div className={`mt-2 text-4xl font-semibold ${(audit.data?.health_score ?? 0) >= 80 ? "text-emerald-300" : "text-amber-300"}`}>{audit.data?.health_score ?? "—"}/100</div>
            <div className="mt-1 text-sm text-white/60">{audit.data?.status ?? "Aucun audit"}</div>
          </div>
          <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 md:col-span-2">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-amber-200"><AlertTriangle className="w-4 h-4" /> Root cause actif</div>
            <div className="mt-2 text-sm text-amber-100">{rootCause}</div>
          </div>
        </section>

        <section>
          <h2 className="text-xs uppercase tracking-wide text-white/40 mb-2">Conversion par étape</h2>
          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full text-sm">
              <thead className="bg-white/[0.04] text-white/60">
                <tr>
                  <th className="text-left px-3 py-2">Étape</th>
                  <th className="text-right px-3 py-2">Volume</th>
                  <th className="text-right px-3 py-2">Conversion</th>
                </tr>
              </thead>
              <tbody>
                {(funnel.data ?? []).map((row) => (
                  <tr key={row.step_key} className="border-t border-white/5">
                    <td className="px-3 py-3 font-medium">{row.label}</td>
                    <td className="px-3 py-3 text-right text-2xl font-semibold">{row.count}</td>
                    <td className={`px-3 py-3 text-right font-semibold ${(row.conversion_from_previous_pct ?? 100) === 0 ? "text-rose-300" : "text-emerald-300"}`}>
                      {row.conversion_from_previous_pct === null ? "—" : `${row.conversion_from_previous_pct}%`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-xs uppercase tracking-wide text-white/40 mb-2">First Dollar Tracker</h2>
          <div className="grid gap-3 md:grid-cols-5">
            {[
              ["First SMS Sent", tracker.data?.first_sms_sent_at],
              ["First Click", tracker.data?.first_click_at],
              ["First Activation", tracker.data?.first_activation_at],
              ["First $1 Payment", tracker.data?.first_paid_at],
              ["First Appointment", tracker.data?.first_appointment_at],
            ].map(([label, at]) => (
              <div key={label as string} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="text-[11px] uppercase tracking-wide text-white/50">{label}</div>
                <div className={`mt-2 text-sm font-semibold ${at ? "text-emerald-300" : "text-amber-300"}`}>{fmt(at as string | null)}</div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-xs uppercase tracking-wide text-white/40 mb-2">Sources</h2>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] divide-y divide-white/5">
            {(sources.data ?? []).map((s) => (
              <div key={s.source} className="grid grid-cols-2 md:grid-cols-5 gap-3 px-4 py-3 text-sm">
                <div className="font-medium">{s.source}</div>
                <div className={s.is_down ? "text-rose-300 font-semibold" : "text-emerald-300 font-semibold"}>{s.display_status}</div>
                <div className="text-white/60">{fmt(s.last_run_at)}</div>
                <div className="text-white/80 md:text-right">{s.is_down ? "SCRAPER DOWN" : s.found_24h}</div>
                <div className="text-white/50 truncate">{s.last_error_message ?? "—"}</div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-xs uppercase tracking-wide text-white/40 mb-2">Dead Queue Detector</h2>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] divide-y divide-white/5">
            {(alerts.data ?? []).length === 0 && <div className="p-4 text-sm text-white/50">Aucune alerte OUTREACH_BLOCKED ouverte.</div>}
            {(alerts.data ?? []).map((a) => (
              <div key={a.id} className="px-4 py-3 text-sm flex items-center gap-3">
                <Activity className="w-4 h-4 text-amber-300" />
                <div className="flex-1">
                  <div className="font-semibold text-amber-200">{a.alert_type} · {a.root_cause}</div>
                  <div className="text-white/60">{a.reason}</div>
                </div>
                <div className="text-xs text-white/50">{fmt(a.detected_at)}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}