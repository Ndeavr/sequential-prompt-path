/**
 * /admin/first-dollar — 11-stage real-time funnel dashboard.
 * Objective: 1 real entrepreneur × 1 successful $1 payment × 1 activated profile.
 */
import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { AlertCircle, ArrowRight, TrendingDown } from "lucide-react";
import {
  useFirstDollarFunnel,
  FUNNEL_STAGES,
  type FunnelPeriod,
} from "@/hooks/useFirstDollarFunnel";
import { supabase } from "@/integrations/supabase/client";

const PERIODS: { key: FunnelPeriod; label: string }[] = [
  { key: "today", label: "Aujourd'hui" },
  { key: "7d", label: "7 jours" },
  { key: "all", label: "Total" },
];

export default function PageAdminFirstDollar() {
  const [period, setPeriod] = useState<FunnelPeriod>("today");
  const { data: counts, isLoading, refetch } = useFirstDollarFunnel(period);
  const [latestReport, setLatestReport] = useState<any>(null);

  useEffect(() => {
    supabase
      .from("first_dollar_daily_reports" as any)
      .select("*")
      .order("report_date", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setLatestReport(data));
  }, []);

  const stage1 = counts?.scraped ?? 0;

  // Compute worst drop-off
  let worstIdx = -1;
  let worstPct = 0;
  if (counts) {
    for (let i = 1; i < FUNNEL_STAGES.length; i++) {
      const prev = counts[FUNNEL_STAGES[i - 1].key];
      const cur = counts[FUNNEL_STAGES[i].key];
      if (prev === 0) continue;
      const drop = 1 - cur / prev;
      if (drop > worstPct) { worstPct = drop; worstIdx = i; }
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-4 sm:px-6 py-8">
      <Helmet><title>First Dollar — Funnel temps réel</title></Helmet>

      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">First Dollar</h1>
            <p className="text-sm text-slate-400 mt-1">
              1 entrepreneur réel · 1 paiement 1 $ · 1 profil activé
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              to="/admin/first-dollar/batches"
              className="text-sm px-4 py-2 rounded-lg bg-white text-slate-950 font-semibold hover:bg-slate-100"
            >
              Envoyer un batch →
            </Link>
            <button
              onClick={() => refetch()}
              className="text-sm px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15"
            >
              {isLoading ? "…" : "Rafraîchir"}
            </button>
          </div>
        </header>

        {/* Period tabs */}
        <div className="inline-flex rounded-xl bg-white/5 p-1 border border-white/10">
          {PERIODS.map(p => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`px-4 py-1.5 text-sm rounded-lg transition ${
                period === p.key ? "bg-white text-slate-950 font-semibold" : "text-slate-300"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Funnel grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          {FUNNEL_STAGES.map((stage, i) => {
            const count = counts?.[stage.key] ?? 0;
            const prev = i === 0 ? count : counts?.[FUNNEL_STAGES[i - 1].key] ?? 0;
            const dropPct = i > 0 && prev > 0 ? Math.round((1 - count / prev) * 100) : 0;
            const convPct = stage1 > 0 ? ((count / stage1) * 100).toFixed(1) : "0";
            const isZero = count === 0 && !isLoading;
            const isWorst = i === worstIdx;
            return (
              <div
                key={stage.key}
                className={`rounded-xl p-3 border ${
                  isZero ? "border-rose-500/60 bg-rose-500/10"
                  : isWorst ? "border-amber-400/60 bg-amber-500/5"
                  : "border-white/10 bg-white/[0.03]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-[10px] uppercase tracking-wider text-slate-400">
                    {i + 1}. {stage.label}
                  </div>
                  {isZero && <AlertCircle className="h-3 w-3 text-rose-400" />}
                  {isWorst && !isZero && <TrendingDown className="h-3 w-3 text-amber-400" />}
                </div>
                <div className="text-3xl font-bold mt-1 tabular-nums">{count}</div>
                <div className="text-[11px] mt-1 flex items-center justify-between text-slate-500">
                  <span>{convPct}% conv.</span>
                  {i > 0 && (
                    <span className={dropPct > 50 ? "text-amber-300" : ""}>
                      -{dropPct}%
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Success card */}
        {(counts?.payment_success ?? 0) > 0 && (
          <div className="rounded-2xl border border-emerald-400/40 bg-emerald-500/10 p-6">
            <div className="text-emerald-300 text-sm uppercase tracking-wider">🎉 Objectif atteint</div>
            <div className="text-2xl font-bold text-white mt-1">
              {counts?.payment_success} paiement{(counts?.payment_success ?? 0) > 1 ? "s" : ""} reçu{(counts?.payment_success ?? 0) > 1 ? "s" : ""}
            </div>
            <div className="text-sm text-emerald-200 mt-1">
              {counts?.activated} profil{(counts?.activated ?? 0) > 1 ? "s" : ""} activé{(counts?.activated ?? 0) > 1 ? "s" : ""}
            </div>
          </div>
        )}

        {/* Latest daily report */}
        {latestReport && (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <div className="text-xs uppercase tracking-wider text-slate-400 mb-1">
              Dernier rapport quotidien · {latestReport.report_date}
            </div>
            <div className="text-sm text-slate-200">
              Plus gros drop-off : <span className="font-semibold text-amber-300">{latestReport.top_dropoff}</span>
            </div>
          </div>
        )}

        {/* Stripe flow verification hint */}
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300">
          <div className="font-semibold text-white mb-2 flex items-center gap-2">
            <ArrowRight className="h-4 w-4" /> Flow de paiement complet
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
            {["Checkout", "Payment", "Webhook", "Subscription", "Activated"].map((s, i) => {
              const stages: (keyof typeof counts)[] = ["checkout_started","payment_success","payment_success","payment_success","activated"] as any;
              const v = counts?.[stages[i] as any] ?? 0;
              return (
                <div key={s} className={`rounded-lg p-2 border ${v > 0 ? "border-emerald-400/40 bg-emerald-500/5" : "border-white/10"}`}>
                  <div className="text-slate-400">{s}</div>
                  <div className="text-lg font-bold">{v}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
