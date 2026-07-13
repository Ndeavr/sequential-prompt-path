/**
 * UNPRO — /admin/tunnel-reality
 * The one page that answers: where does the money stop?
 * STRICT SMS-attribution counts. Unattributed checkouts are surfaced separately.
 * Real-send requires explicit confirmation.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertOctagon, AlertTriangle, Copy, FlaskConical, Loader2, Lock,
  RefreshCw, Send, ShieldCheck, Wrench, X,
} from "lucide-react";
import { toast } from "sonner";
import TunnelE2ETestPanel from "@/components/admin/TunnelE2ETestPanel";

type Win = "24h" | "7d" | "30d";

interface Stage {
  key: string;
  label: string;
  order: number;
  totals: Record<Win, number>;
  last_event_at: string | null;
  top_error: string | null;
  color: "red" | "amber" | "green";
  conv_7d_pct: number | null;
}
interface UnattributedSample {
  id: string;
  plan: string | null;
  status: string | null;
  external_id_masked: string | null;
  created_at: string;
  reason: string;
}
interface UnattributedWindow {
  total: number;
  attributed: number;
  unattributed: number;
  by_plan: Record<string, number>;
  samples: UnattributedSample[];
}
interface Report {
  generated_at: string;
  stages: Stage[];
  blocker: { stage_key: string; stage_label: string; top_error: string | null; conv_pct: number | null } | null;
  last_paid_at: string | null;
  simulation: { hint_dry_run: boolean; sms_simulated: Record<Win, number> };
  unattributed_checkouts: Record<Win, UnattributedWindow>;
}

const COLORS = {
  red: "bg-red-500/15 border-red-500/40 text-red-300",
  amber: "bg-amber-500/15 border-amber-500/40 text-amber-300",
  green: "bg-emerald-500/10 border-emerald-500/30 text-emerald-300",
};

function timeAgo(iso: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "à l'instant";
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h} h`;
  return `il y a ${Math.floor(h / 24)} j`;
}

export default function PageTunnelReality() {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [win, setWin] = useState<Win>("7d");
  const [dryRun, setDryRun] = useState(true);
  const [relancing, setRelancing] = useState(false);
  const [confirmReal, setConfirmReal] = useState(false);
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [showUnattributed, setShowUnattributed] = useState(false);
  const [repairGaps, setRepairGaps] = useState<{ total_paid: number; missing_contractor: number; missing_profile: number } | null>(null);
  const [repairing, setRepairing] = useState(false);

  const scanRepair = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke("repair-paid-contractor-activation", { body: {} });
      if (error) throw error;
      setRepairGaps(data as any);
    } catch (e) {
      // silent
      console.warn("scanRepair", e);
    }
  }, []);

  const runRepair = async () => {
    setRepairing(true);
    try {
      const { data, error } = await supabase.functions.invoke("repair-paid-contractor-activation", {
        body: { sweep: true, limit: 200 },
      });
      if (error) throw error;
      const r = data as any;
      toast.success(`Réparation — scannés ${r.scanned} · réparés ${r.repaired}`);
      await scanRepair();
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setRepairing(false);
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.functions.invoke("tunnel-reality-report", {
        body: { dry_run: dryRun },
      });
      if (error) throw error;
      setReport(data as Report);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [dryRun]);

  useEffect(() => {
    load();
    scanRepair();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, [load, scanRepair]);

  const runRelances = async (isDryRun: boolean) => {
    setRelancing(true);
    try {
      const { data, error } = await supabase.functions.invoke("outreach-relance-cron", {
        body: { dry_run: isDryRun, limit: 100 },
      });
      if (error) throw error;
      const s = (data as any)?.summary ?? {};
      toast.success(
        `Relances ${isDryRun ? "SIMULÉES" : "ENVOYÉES"} — J+1:${s.j1 ?? 0} · J+3:${s.j3 ?? 0} · J+7:${s.j7 ?? 0} · envoyés ${s.sent ?? 0} · échoués ${s.failed ?? 0}`,
      );
      setConfirmReal(false);
      setConfirmChecked(false);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setRelancing(false);
    }
  };

  const copyReport = () => {
    if (!report) return;
    const u = report.unattributed_checkouts[win];
    const lines = [
      `# UNPRO — Tunnel Reality (${new Date(report.generated_at).toLocaleString("fr-CA")}) · fenêtre ${win}`,
      dryRun
        ? `**Mode : SIMULATION ACTIVE** — aucun SMS réel envoyé.`
        : (report.blocker
          ? `**Blocage #1 :** ${report.blocker.stage_label}${report.blocker.top_error ? ` — ${report.blocker.top_error}` : ""}`
          : "**Aucun blocage rouge détecté.**"),
      `Dernière vente attribuée : ${timeAgo(report.last_paid_at)}`,
      `Checkouts hors tunnel SMS (${win}) : ${u?.unattributed ?? 0} / ${u?.total ?? 0}`,
      "",
      "| Étape | 24h | 7j | 30j | Conv 7j | Statut |",
      "| --- | ---: | ---: | ---: | ---: | :---: |",
      ...report.stages.map(
        (s) =>
          `| ${s.label} | ${s.totals["24h"]} | ${s.totals["7d"]} | ${s.totals["30d"]} | ${s.conv_7d_pct !== null ? s.conv_7d_pct + "%" : "—"} | ${s.color.toUpperCase()} |`,
      ),
    ];
    navigator.clipboard.writeText(lines.join("\n"));
    toast.success("Rapport copié");
  };

  const sorted = useMemo(() => (report?.stages ?? []).sort((a, b) => a.order - b.order), [report]);
  const uWin = report?.unattributed_checkouts[win];
  const simSent = report?.simulation?.sms_simulated[win] ?? 0;
  const smsSentReal = sorted.find((s) => s.key === "sms_sent")?.totals[win] ?? 0;

  return (
    <div className="admin-theme min-h-screen bg-background text-foreground p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-4 md:space-y-6">
        <header className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Tunnel Reality</h1>
            <p className="text-sm opacity-70 mt-1">
              Attribution stricte : SMS → clic → landing → compte → paiement 1 $ → activation → recommandable.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex rounded-lg border border-border overflow-hidden text-xs">
              {(["24h", "7d", "30d"] as Win[]).map((w) => (
                <button
                  key={w}
                  onClick={() => setWin(w)}
                  className={`px-3 py-1.5 ${win === w ? "bg-amber-400 text-black font-semibold" : "opacity-70"}`}
                >
                  {w}
                </button>
              ))}
            </div>
            <button
              onClick={load}
              disabled={loading}
              className="rounded-lg bg-white/10 border border-border px-3 py-1.5 text-sm inline-flex items-center gap-1 disabled:opacity-40"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Refresh
            </button>
            <button
              onClick={copyReport}
              disabled={!report}
              className="rounded-lg bg-white/10 border border-border px-3 py-1.5 text-sm inline-flex items-center gap-1 disabled:opacity-40"
            >
              <Copy className="w-4 h-4" /> Copier
            </button>
          </div>
        </header>

        {error && (
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Banner: simulation vs blocage */}
        {dryRun ? (
          <div className="rounded-2xl border border-sky-500/40 bg-sky-500/10 p-4 flex items-start gap-3">
            <FlaskConical className="w-6 h-6 text-sky-300 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="text-sm font-bold text-sky-200 uppercase tracking-wide">
                Mode simulation actif
              </div>
              <div className="text-xs text-sky-100/80 mt-1">
                Aucun SMS réel n'est envoyé. Les relances simulées ne rentrent pas dans les compteurs réels.
                {simSent > 0 && ` · ${simSent} SMS simulés dans la fenêtre ${win}.`}
              </div>
              <button
                onClick={() => setDryRun(false)}
                className="mt-2 text-xs underline text-sky-200 hover:text-sky-100"
              >
                Préparer un envoi réel →
              </button>
            </div>
          </div>
        ) : report?.blocker ? (
          <div className="rounded-2xl border border-red-500/50 bg-red-500/15 p-4 flex items-start gap-3">
            <AlertOctagon className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="text-sm font-bold text-red-200 uppercase tracking-wide">
                Blocage #1 : {report.blocker.stage_label}
              </div>
              {report.blocker.top_error && (
                <div className="text-xs text-red-100/80 mt-1 font-mono">
                  {report.blocker.top_error}
                </div>
              )}
              <div className="text-xs text-red-100/70 mt-1">
                Conversion actuelle : {report.blocker.conv_pct !== null ? `${report.blocker.conv_pct}%` : "n/a"} · Dernière vente {timeAgo(report.last_paid_at)}
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 flex items-start gap-3">
            <ShieldCheck className="w-6 h-6 text-emerald-300 shrink-0 mt-0.5" />
            <div className="flex-1 text-sm text-emerald-200">
              Aucun blocage rouge · dernière vente {timeAgo(report?.last_paid_at ?? null)}.
            </div>
          </div>
        )}

        {/* Unattributed checkouts anomaly card */}
        {uWin && uWin.unattributed > 0 && (
          <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4">
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-amber-300 shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-bold text-amber-200 uppercase tracking-wide">
                    {uWin.unattributed} checkout{uWin.unattributed > 1 ? "s" : ""} hors tunnel SMS ({win})
                  </div>
                  <div className="text-xs text-amber-100/80 mt-1">
                    Non attribué{uWin.unattributed > 1 ? "s" : ""} au tunnel 1 $ · exclu{uWin.unattributed > 1 ? "s" : ""} des compteurs.
                    {" "}Attribués : {uWin.attributed}/{uWin.total}.
                  </div>
                  {Object.keys(uWin.by_plan).length > 0 && (
                    <div className="text-[11px] text-amber-100/70 mt-1 font-mono">
                      {Object.entries(uWin.by_plan)
                        .map(([plan, n]) => `${plan}:${n}`)
                        .join(" · ")}
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={() => setShowUnattributed(true)}
                className="rounded-lg bg-white/10 border border-border px-3 py-1.5 text-sm"
              >
                Voir les sessions non attribuées
              </button>
            </div>
          </div>
        )}

        {/* Relance panel */}
        <div className="rounded-2xl border border-border bg-white/[0.02] p-4 flex flex-wrap items-center gap-3 justify-between">
          <div>
            <div className="text-sm font-semibold">Relances automatiques J+1 / J+3 / J+7</div>
            <div className="text-xs opacity-70 mt-0.5">
              Cap 3 par prospect · nouveau token à chaque relance · fenêtre 20 h anti-doublon.
            </div>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={dryRun}
                onChange={(e) => setDryRun(e.target.checked)}
              />
              Simulation
            </label>
            <button
              onClick={() => (dryRun ? runRelances(true) : setConfirmReal(true))}
              disabled={relancing}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold inline-flex items-center gap-1 ${dryRun ? "bg-amber-400 text-black" : "bg-red-500 text-white"}`}
            >
              {relancing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {dryRun ? "Simuler les relances" : "Envoyer relances réelles…"}
            </button>
          </div>
        </div>

        {/* Repair panel */}
        <div className="rounded-2xl border border-border bg-white/[0.02] p-4 flex flex-wrap items-center gap-3 justify-between">
          <div>
            <div className="text-sm font-semibold flex items-center gap-2">
              <Wrench className="w-4 h-4" /> Réparer les activations payées
            </div>
            <div className="text-xs opacity-70 mt-0.5">
              {repairGaps
                ? `${repairGaps.total_paid} paiements 1 $ · ${repairGaps.missing_contractor} sans entrepreneur · ${repairGaps.missing_profile} sans profil.`
                : "Analyse des paiements 1 $…"}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={scanRepair}
              className="rounded-lg bg-white/10 border border-border px-3 py-1.5 text-sm inline-flex items-center gap-1"
            >
              <RefreshCw className="w-4 h-4" /> Rescanner
            </button>
            <button
              onClick={runRepair}
              disabled={repairing || (repairGaps?.missing_contractor === 0 && repairGaps?.missing_profile === 0)}
              className="rounded-lg px-3 py-1.5 text-sm font-semibold inline-flex items-center gap-1 bg-emerald-500 text-white disabled:opacity-40"
            >
              {repairing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wrench className="w-4 h-4" />}
              Réparer maintenant
            </button>
          </div>
        </div>

        {/* Desktop table */}
        <div className="hidden md:block rounded-2xl border border-border overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-white/5">
              <tr className="text-left text-xs uppercase tracking-wider opacity-70">
                <th className="py-2 px-4 w-8">#</th>
                <th className="py-2 px-4">Étape</th>
                <th className="py-2 px-4 text-right">Total ({win})</th>
                <th className="py-2 px-4 text-right">Conv 7j</th>
                <th className="py-2 px-4">Dernier événement</th>
                <th className="py-2 px-4">Statut</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((s) => (
                <tr key={s.key} className={`border-t border-border ${report?.blocker?.stage_key === s.key && !dryRun ? "bg-red-500/5" : ""}`}>
                  <td className="py-2 px-4 opacity-50">{s.order}</td>
                  <td className="py-2 px-4">
                    {s.label}
                    {s.top_error && (
                      <div className="text-[10px] opacity-70 mt-0.5 font-mono">{s.top_error}</div>
                    )}
                  </td>
                  <td className="py-2 px-4 text-right font-mono tabular-nums">
                    {s.totals[win].toLocaleString("fr-CA")}
                  </td>
                  <td className="py-2 px-4 text-right font-mono tabular-nums opacity-80">
                    {s.conv_7d_pct !== null ? `${s.conv_7d_pct}%` : "—"}
                  </td>
                  <td className="py-2 px-4 text-xs opacity-70">{timeAgo(s.last_event_at)}</td>
                  <td className="py-2 px-4">
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] uppercase ${COLORS[s.color]}`}>
                      {s.color === "red" ? "🔴" : s.color === "amber" ? "🟡" : "🟢"} {s.color}
                    </span>
                  </td>
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center opacity-60">
                    {loading ? "Chargement…" : "Aucune donnée"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile stacked cards */}
        <div className="md:hidden space-y-2">
          {sorted.map((s) => (
            <div
              key={s.key}
              className={`rounded-xl border p-3 ${
                s.color === "red" ? "border-red-500/40 bg-red-500/5"
                : s.color === "amber" ? "border-amber-500/40 bg-amber-500/5"
                : "border-emerald-500/30 bg-emerald-500/5"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[10px] opacity-50">Étape {s.order}</div>
                  <div className="text-sm font-semibold">{s.label}</div>
                  {s.top_error && (
                    <div className="text-[10px] opacity-70 mt-0.5 font-mono truncate">{s.top_error}</div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xl font-mono tabular-nums">
                    {s.totals[win].toLocaleString("fr-CA")}
                  </div>
                  <div className="text-[10px] opacity-70">
                    conv {s.conv_7d_pct !== null ? `${s.conv_7d_pct}%` : "—"}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between mt-2 text-[10px]">
                <span className="opacity-60">{timeAgo(s.last_event_at)}</span>
                <span className={`rounded-full border px-2 py-0.5 uppercase ${COLORS[s.color]}`}>
                  {s.color === "red" ? "🔴" : s.color === "amber" ? "🟡" : "🟢"} {s.color}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="text-xs opacity-60">
          Rafraîchi automatiquement toutes les 30 s · dernière mise à jour {report ? timeAgo(report.generated_at) : "—"}.
        </div>
      </div>

      {/* Unattributed drawer */}
      {showUnattributed && uWin && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-end md:items-center justify-center p-2 md:p-4"
          onClick={() => setShowUnattributed(false)}
        >
          <div
            className="bg-background border border-border rounded-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div>
                <div className="text-sm font-semibold">Sessions Stripe non attribuées ({win})</div>
                <div className="text-xs opacity-70">
                  {uWin.unattributed} sur {uWin.total} · attribuées SMS : {uWin.attributed}
                </div>
              </div>
              <button
                onClick={() => setShowUnattributed(false)}
                className="p-1 rounded hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="overflow-auto flex-1">
              <table className="min-w-full text-xs">
                <thead className="bg-white/5 sticky top-0">
                  <tr className="text-left uppercase tracking-wider opacity-70">
                    <th className="py-2 px-3">Date</th>
                    <th className="py-2 px-3">Plan</th>
                    <th className="py-2 px-3">Statut</th>
                    <th className="py-2 px-3">Session Stripe</th>
                    <th className="py-2 px-3">Raison</th>
                  </tr>
                </thead>
                <tbody>
                  {uWin.samples.map((s) => (
                    <tr key={s.id} className="border-t border-border">
                      <td className="py-2 px-3 opacity-70">{new Date(s.created_at).toLocaleString("fr-CA")}</td>
                      <td className="py-2 px-3 font-mono">{s.plan ?? "—"}</td>
                      <td className="py-2 px-3">{s.status ?? "—"}</td>
                      <td className="py-2 px-3 font-mono opacity-70">{s.external_id_masked ?? "—"}</td>
                      <td className="py-2 px-3 text-amber-200">{s.reason}</td>
                    </tr>
                  ))}
                  {uWin.samples.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center opacity-60">
                        Aucune session non attribuée sur cette fenêtre.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Real-send confirmation modal */}
      {confirmReal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => !relancing && setConfirmReal(false)}
        >
          <div
            className="bg-background border border-red-500/40 rounded-2xl w-full max-w-lg p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <AlertOctagon className="w-6 h-6 text-red-400 shrink-0" />
              <div>
                <div className="text-lg font-semibold">Envoyer de vrais SMS ?</div>
                <div className="text-xs opacity-70 mt-1">
                  Vous allez déclencher un envoi Twilio réel. Cette action consomme des crédits et impacte la réputation de l'expéditeur.
                </div>
              </div>
            </div>
            <ul className="text-xs space-y-1 opacity-90 rounded-lg border border-border p-3">
              <li>• Limite d'envoi : 100 prospects par exécution</li>
              <li>• Exclus automatiquement : numéros fixes, doublons, désabonnés</li>
              <li>• Cap 3 relances par prospect (J+1 / J+3 / J+7)</li>
              <li>• Coût estimé : ≈ {(0.02 * 100).toFixed(2)} $ CAD (max)</li>
              <li>• Nouveau token de tracking à chaque envoi</li>
            </ul>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={confirmChecked}
                onChange={(e) => setConfirmChecked(e.target.checked)}
              />
              Je confirme envoyer de vrais SMS.
            </label>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setConfirmReal(false)}
                disabled={relancing}
                className="rounded-lg bg-white/10 border border-border px-3 py-1.5 text-sm"
              >
                Annuler
              </button>
              <button
                onClick={() => runRelances(false)}
                disabled={!confirmChecked || relancing}
                className="rounded-lg bg-red-500 text-white px-3 py-1.5 text-sm font-semibold inline-flex items-center gap-1 disabled:opacity-40"
              >
                {relancing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Envoyer maintenant
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
