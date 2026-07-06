/**
 * /admin/first-dollar-sprint — Real-time funnel dashboard for the sprint.
 * Shows drop-off between SMS → click → checkout → paid → activated.
 */
import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";

type EventRow = {
  event: string;
  campaign_variant: string | null;
  city: string | null;
  created_at: string;
};

const FUNNEL = [
  "sms_sent",
  "sms_delivered",
  "link_clicked",
  "landing_viewed",
  "checkout_opened",
  "checkout_paid",
  "activated",
] as const;

const LABELS: Record<string, string> = {
  sms_sent: "SMS envoyé",
  sms_delivered: "SMS livré",
  link_clicked: "Lien cliqué",
  landing_viewed: "Landing vue",
  checkout_opened: "Checkout ouvert",
  checkout_paid: "Paiement reçu",
  activated: "Profil activé",
};

export default function PageFirstDollarSprint() {
  const [rows, setRows] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("first_dollar_sprint_events")
      .select("event, campaign_variant, city, created_at")
      .order("created_at", { ascending: false })
      .limit(2000);
    setRows((data ?? []) as EventRow[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, []);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const r of rows) c[r.event] = (c[r.event] ?? 0) + 1;
    return c;
  }, [rows]);

  const byVariant = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    for (const r of rows) {
      const v = r.campaign_variant ?? "—";
      map[v] ??= {};
      map[v][r.event] = (map[v][r.event] ?? 0) + 1;
    }
    return map;
  }, [rows]);

  const biggestDrop = useMemo(() => {
    let worstIdx = -1;
    let worstPct = 1;
    for (let i = 1; i < FUNNEL.length; i++) {
      const prev = counts[FUNNEL[i - 1]] ?? 0;
      const cur = counts[FUNNEL[i]] ?? 0;
      if (prev === 0) continue;
      const pct = cur / prev;
      if (pct < worstPct) {
        worstPct = pct;
        worstIdx = i;
      }
    }
    return worstIdx;
  }, [counts]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-6 py-8">
      <Helmet>
        <title>First-Dollar Sprint — UNPRO Admin</title>
      </Helmet>

      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">First-Dollar Sprint</h1>
            <p className="text-sm text-slate-400">
              Isolation QC · 25 SMS × 5 variantes · objectif : 1 paiement 1 $
            </p>
          </div>
          <button
            onClick={load}
            className="text-xs px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15"
          >
            {loading ? "…" : "Rafraîchir"}
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-7 gap-3 mb-8">
          {FUNNEL.map((step, i) => {
            const count = counts[step] ?? 0;
            const prev = i === 0 ? count : counts[FUNNEL[i - 1]] ?? 0;
            const pct = prev > 0 ? Math.round((count / prev) * 100) : 100;
            const worst = i === biggestDrop;
            return (
              <div
                key={step}
                className={`rounded-xl p-3 border ${
                  worst
                    ? "border-rose-400/60 bg-rose-500/10"
                    : "border-white/10 bg-white/[0.03]"
                }`}
              >
                <div className="text-[10.5px] uppercase tracking-wider text-slate-400">
                  {LABELS[step]}
                </div>
                <div className="text-2xl font-bold mt-1">{count}</div>
                {i > 0 && (
                  <div
                    className={`text-[11px] mt-0.5 ${
                      worst ? "text-rose-300" : "text-slate-500"
                    }`}
                  >
                    {pct}% vs précédent
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <h2 className="text-sm uppercase tracking-wider text-slate-400 mb-3">
          Performance par variante
        </h2>
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-white/5">
              <tr>
                <th className="text-left px-3 py-2">Variante</th>
                {FUNNEL.map((s) => (
                  <th key={s} className="text-right px-3 py-2 text-slate-400 font-normal">
                    {LABELS[s]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(byVariant).map(([v, c]) => (
                <tr key={v} className="border-t border-white/5">
                  <td className="px-3 py-2 font-semibold">{v}</td>
                  {FUNNEL.map((s) => (
                    <td key={s} className="text-right px-3 py-2 tabular-nums">
                      {c[s] ?? 0}
                    </td>
                  ))}
                </tr>
              ))}
              {Object.keys(byVariant).length === 0 && (
                <tr>
                  <td colSpan={FUNNEL.length + 1} className="px-3 py-6 text-center text-slate-500">
                    Aucun événement encore. Envoyez les 25 SMS pour commencer.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-[13px] text-slate-300">
          <div className="font-semibold text-white mb-1">Règle d'arrêt</div>
          1+ paiement → cloner la variante gagnante sur toiture / fondation / moisissure / thermopompe.
          <br />
          0 paiement + clics → corriger landing ou checkout avant nouvel envoi.
          <br />
          0 clic → corriger la copie SMS ou le ciblage.
        </div>
      </div>
    </div>
  );
}
