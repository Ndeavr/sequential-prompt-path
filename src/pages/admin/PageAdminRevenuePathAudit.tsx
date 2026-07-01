/**
 * /admin/revenue-path-audit — full-funnel counts + conversion + top blocker.
 */
import { useEffect, useState } from "react";
import SectionErrorBoundary from "@/components/admin/SectionErrorBoundary";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, RefreshCw, AlertTriangle } from "lucide-react";

type Stage = {
  key: string;
  label: string;
  count: number;
  conv_pct: number | null;
  blocker: string | null;
};

export default function PageAdminRevenuePathAudit() {
  const [days, setDays] = useState(30);
  const [stages, setStages] = useState<Stage[]>([]);
  const [bottleneck, setBottleneck] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.functions.invoke("revenue-path-audit", {
        body: { days },
      });
      if (error) throw error;
      const d = data as any;
      if (d?.error) throw new Error(d.error);
      setStages(d.stages ?? []);
      setBottleneck(d.bottleneck ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="admin-theme min-h-screen bg-background text-foreground p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Full Revenue Path Audit</h1>
            <p className="text-sm opacity-70 mt-1">
              Prospect → SMS → Email → Click → Checkout → Webhook → Activation → Visibility.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="rounded-lg bg-transparent border border-border px-2 py-1 text-sm"
            >
              <option value={7}>7 days</option>
              <option value={30}>30 days</option>
              <option value={90}>90 days</option>
            </select>
            <button
              onClick={load}
              disabled={loading}
              className="rounded-lg bg-amber-400 text-black px-3 py-1.5 text-sm font-semibold inline-flex items-center gap-1 disabled:opacity-40"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Refresh
            </button>
          </div>
        </header>

        {error && <p className="text-sm text-red-400">{error}</p>}

        {bottleneck && (
          <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm inline-flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>
              Current bottleneck:{" "}
              <span className="font-mono font-semibold">{bottleneck}</span>
            </span>
          </div>
        )}

        <SectionErrorBoundary title="Funnel" onRetry={load}>
          <div className="rounded-2xl border border-border overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-white/5">
                <tr className="text-left text-xs opacity-70">
                  <th className="py-2 px-4">Stage</th>
                  <th className="py-2 px-4 text-right">Count</th>
                  <th className="py-2 px-4 text-right">Conv %</th>
                  <th className="py-2 px-4">Blocker</th>
                </tr>
              </thead>
              <tbody>
                {stages.map((s) => {
                  const isBottleneck = s.key === bottleneck;
                  return (
                    <tr key={s.key} className={`border-t border-border ${isBottleneck ? "bg-amber-500/10" : ""}`}>
                      <td className="py-2 px-4">{s.label}</td>
                      <td className="py-2 px-4 text-right font-mono">{s.count.toLocaleString()}</td>
                      <td className="py-2 px-4 text-right font-mono">
                        {s.conv_pct === null ? "—" : `${s.conv_pct}%`}
                      </td>
                      <td className="py-2 px-4 text-xs opacity-80">{s.blocker ?? "—"}</td>
                    </tr>
                  );
                })}
                {stages.length === 0 && !loading && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center opacity-60">No data</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </SectionErrorBoundary>

        <div className="text-xs opacity-60">
          <a href="/admin/revenue-gate-audit" className="underline">← Real $1 Stripe test cockpit</a>
        </div>
      </div>
    </div>
  );
}
