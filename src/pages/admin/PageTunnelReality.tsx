/**
 * UNPRO — /admin/tunnel-reality
 * The one page that answers: where does the money stop?
 * Live counts from Supabase across 24h / 7d / 30d, top blocker banner,
 * and a manual trigger for the J+1/J+3/J+7 relance cron (dry-run by default).
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AlertOctagon, Copy, Loader2, RefreshCw, Send, Wrench } from "lucide-react";
import { toast } from "sonner";

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
interface Report {
  generated_at: string;
  stages: Stage[];
  blocker: { stage_key: string; stage_label: string; top_error: string | null; conv_pct: number | null } | null;
  last_paid_at: string | null;
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
  const [window, setWindow] = useState<Win>("7d");
  const [dryRun, setDryRun] = useState(true);
  const [relancing, setRelancing] = useState(false);
  const [repairGaps, setRepairGaps] = useState<{ total_paid: number; missing_contractor: number; missing_profile: number } | null>(null);
  const [repairing, setRepairing] = useState(false);

  const scanRepair = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke("repair-paid-contractor-activation", { body: {} });
      if (error) throw error;
      setRepairGaps(data as any);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
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
      const { data, error } = await supabase.functions.invoke("tunnel-reality-report", { body: {} });
      if (error) throw error;
      setReport(data as Report);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    scanRepair();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, [load, scanRepair]);

  const runRelances = async () => {
    setRelancing(true);
    try {
      const { data, error } = await supabase.functions.invoke("outreach-relance-cron", {
        body: { dry_run: dryRun, limit: 100 },
      });
      if (error) throw error;
      const s = (data as any)?.summary ?? {};
      toast.success(
        `Relances ${dryRun ? "SIMULÉES" : "ENVOYÉES"} — J+1:${s.j1 ?? 0} · J+3:${s.j3 ?? 0} · J+7:${s.j7 ?? 0} · envoyés ${s.sent ?? 0} · échoués ${s.failed ?? 0}`,
      );
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setRelancing(false);
    }
  };

  const copyReport = () => {
    if (!report) return;
    const lines = [
      `# UNPRO — Tunnel Reality (${new Date(report.generated_at).toLocaleString("fr-CA")})`,
      report.blocker
        ? `**Blocage #1 :** ${report.blocker.stage_label}${report.blocker.top_error ? ` — ${report.blocker.top_error}` : ""}`
        : "**Aucun blocage rouge détecté.**",
      `Dernière vente : ${timeAgo(report.last_paid_at)}`,
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

  return (
    <div className="admin-theme min-h-screen bg-background text-foreground p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Tunnel Reality</h1>
            <p className="text-sm opacity-70 mt-1">
              Chiffres réels : SMS → clic → landing → compte → paiement 1 $ → activation → recommandable.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg border border-border overflow-hidden text-xs">
              {(["24h", "7d", "30d"] as Win[]).map((w) => (
                <button
                  key={w}
                  onClick={() => setWindow(w)}
                  className={`px-3 py-1.5 ${window === w ? "bg-amber-400 text-black font-semibold" : "opacity-70"}`}
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

        {report?.blocker && (
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
              Dry-run
            </label>
            <button
              onClick={runRelances}
              disabled={relancing}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold inline-flex items-center gap-1 ${dryRun ? "bg-amber-400 text-black" : "bg-red-500 text-white"}`}
            >
              {relancing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {dryRun ? "Simuler les relances" : "ENVOYER RELANCES RÉELLES"}
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-border overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-white/5">
              <tr className="text-left text-xs uppercase tracking-wider opacity-70">
                <th className="py-2 px-4 w-8">#</th>
                <th className="py-2 px-4">Étape</th>
                <th className="py-2 px-4 text-right">Total ({window})</th>
                <th className="py-2 px-4 text-right">Conv 7j</th>
                <th className="py-2 px-4">Dernier événement</th>
                <th className="py-2 px-4">Statut</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((s) => (
                <tr key={s.key} className={`border-t border-border ${report?.blocker?.stage_key === s.key ? "bg-red-500/5" : ""}`}>
                  <td className="py-2 px-4 opacity-50">{s.order}</td>
                  <td className="py-2 px-4">
                    {s.label}
                    {s.top_error && (
                      <div className="text-[10px] opacity-70 mt-0.5 font-mono">{s.top_error}</div>
                    )}
                  </td>
                  <td className="py-2 px-4 text-right font-mono tabular-nums">
                    {s.totals[window].toLocaleString("fr-CA")}
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

        <div className="text-xs opacity-60">
          Rafraîchi automatiquement toutes les 30 s · dernière mise à jour {report ? timeAgo(report.generated_at) : "—"}.
        </div>
      </div>
    </div>
  );
}
