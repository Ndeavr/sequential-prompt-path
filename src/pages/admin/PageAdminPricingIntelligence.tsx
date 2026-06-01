/**
 * UNPRO — Admin Pricing Intelligence
 * Route: /admin/pricing-intelligence
 * Cockpit of every personalized quote, with status workflow and details.
 */
import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { formatCAD, type PricingQuote } from "@/services/contractorPricingQuoteService";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const STATUSES = [
  "draft",
  "offered",
  "accepted",
  "paid",
  "waitlisted",
  "rejected",
] as const;
type Status = (typeof STATUSES)[number];

const STATUS_COLORS: Record<Status, string> = {
  draft: "bg-slate-500/20 text-slate-200",
  offered: "bg-blue-500/20 text-blue-200",
  accepted: "bg-amber-500/20 text-amber-200",
  paid: "bg-emerald-500/20 text-emerald-200",
  waitlisted: "bg-orange-500/20 text-orange-200",
  rejected: "bg-red-500/20 text-red-200",
};

export default function PageAdminPricingIntelligence() {
  const [quotes, setQuotes] = useState<PricingQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<Status | "all">("all");
  const [filterCity, setFilterCity] = useState("");
  const [filterTrade, setFilterTrade] = useState("");
  const [selected, setSelected] = useState<PricingQuote | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("contractor_pricing_quotes" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) {
      toast.error(error.message);
    } else {
      setQuotes((data ?? []) as unknown as PricingQuote[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    return quotes.filter((q) => {
      if (filterStatus !== "all" && q.pricing_status !== filterStatus)
        return false;
      if (
        filterCity &&
        !(q.city ?? "").toLowerCase().includes(filterCity.toLowerCase())
      )
        return false;
      if (
        filterTrade &&
        !(q.trade_primary ?? "")
          .toLowerCase()
          .includes(filterTrade.toLowerCase())
      )
        return false;
      return true;
    });
  }, [quotes, filterStatus, filterCity, filterTrade]);

  const kpis = useMemo(() => {
    const last7 = quotes.filter(
      (q) =>
        Date.now() - new Date(q.created_at).getTime() < 7 * 24 * 60 * 60 * 1000,
    );
    const accepted = quotes.filter(
      (q) => q.pricing_status === "accepted" || q.pricing_status === "paid",
    );
    const waitlisted = quotes.filter((q) => q.pricing_status === "waitlisted");
    const acceptRate = quotes.length
      ? Math.round((accepted.length / quotes.length) * 100)
      : 0;
    const avgPrice = quotes.length
      ? Math.round(
          quotes.reduce((a, q) => a + q.recommended_monthly_price, 0) /
            quotes.length,
        )
      : 0;
    const mrr = quotes
      .filter((q) => q.pricing_status === "paid")
      .reduce((a, q) => a + q.recommended_monthly_price, 0);
    return {
      last7: last7.length,
      acceptRate,
      avgPrice,
      waitlistPct: quotes.length
        ? Math.round((waitlisted.length / quotes.length) * 100)
        : 0,
      mrr,
    };
  }, [quotes]);

  const updateStatus = async (id: string, status: Status) => {
    const { error } = await supabase
      .from("contractor_pricing_quotes" as any)
      .update({ pricing_status: status })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Statut mis à jour.");
    setSelected(null);
    load();
  };

  return (
    <div className="min-h-screen bg-[#050816] text-white p-6">
      <Helmet>
        <title>Pricing Intelligence · Admin UNPRO</title>
      </Helmet>

      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-semibold tracking-tight mb-6">
          Pricing Intelligence
        </h1>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          <KPI label="Devis 7j" value={String(kpis.last7)} />
          <KPI label="Taux d'acceptation" value={`${kpis.acceptRate}%`} />
          <KPI label="Panier moyen" value={formatCAD(kpis.avgPrice)} />
          <KPI label="% liste d'attente" value={`${kpis.waitlistPct}%`} />
          <KPI label="MRR payé" value={formatCAD(kpis.mrr)} />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-4">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2 text-sm"
          >
            <option value="all">Tous statuts</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <input
            placeholder="Ville"
            value={filterCity}
            onChange={(e) => setFilterCity(e.target.value)}
            className="bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2 text-sm"
          />
          <input
            placeholder="Métier"
            value={filterTrade}
            onChange={(e) => setFilterTrade(e.target.value)}
            className="bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2 text-sm"
          />
          <button
            onClick={load}
            className="ml-auto px-4 py-2 text-sm bg-white/[0.06] border border-white/10 rounded-lg"
          >
            Rafraîchir
          </button>
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-white/10 overflow-hidden bg-white/[0.02]">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin opacity-60" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center text-white/50 text-sm">
              Aucun devis.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-white/[0.04] text-white/60 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="text-left px-4 py-3">Entreprise</th>
                    <th className="text-left px-4 py-3">Métier</th>
                    <th className="text-left px-4 py-3">Ville</th>
                    <th className="text-left px-4 py-3">Plan</th>
                    <th className="text-right px-4 py-3">Prix</th>
                    <th className="text-right px-4 py-3">ROI</th>
                    <th className="text-left px-4 py-3">Statut</th>
                    <th className="text-left px-4 py-3">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((q) => (
                    <tr
                      key={q.id}
                      onClick={() => setSelected(q)}
                      className="border-t border-white/5 hover:bg-white/[0.04] cursor-pointer"
                    >
                      <td className="px-4 py-3">
                        {q.company_name ?? "—"}
                      </td>
                      <td className="px-4 py-3">{q.trade_primary}</td>
                      <td className="px-4 py-3">{q.city}</td>
                      <td className="px-4 py-3 capitalize">
                        {q.recommended_plan}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {formatCAD(q.recommended_monthly_price)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        ×{Math.round(q.roi_estimate)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[q.pricing_status as Status]}`}
                        >
                          {q.pricing_status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-white/60 text-xs">
                        {new Date(q.created_at).toLocaleDateString("fr-CA")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Drawer */}
        {selected && (
          <div
            className="fixed inset-0 z-50 bg-black/60 flex justify-end"
            onClick={() => setSelected(null)}
          >
            <div
              className="bg-[#0a1020] border-l border-white/10 w-full max-w-md h-full overflow-y-auto p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-lg font-semibold">
                  Devis #{selected.id.slice(0, 8)}
                </h2>
                <button
                  onClick={() => setSelected(null)}
                  className="text-white/60"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-2 text-sm">
                <Detail label="Entreprise" value={selected.company_name ?? "—"} />
                <Detail label="Métier" value={selected.trade_primary} />
                <Detail label="Ville" value={selected.city} />
                <Detail label="Plan" value={selected.recommended_plan} />
                <Detail
                  label="Prix recommandé"
                  value={formatCAD(selected.recommended_monthly_price)}
                />
                <Detail
                  label="Potentiel revenu"
                  value={`${selected.estimated_monthly_revenue_potential.toLocaleString("fr-CA")} $`}
                />
                <Detail label="ROI" value={`×${Math.round(selected.roi_estimate)}`} />
              </div>

              <div className="mt-6">
                <div className="text-xs uppercase tracking-wider text-white/50 mb-2">
                  Statut
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {STATUSES.map((s) => (
                    <button
                      key={s}
                      onClick={() => updateStatus(selected.id, s)}
                      className={`text-xs px-3 py-2 rounded-lg border ${
                        selected.pricing_status === s
                          ? "border-amber-400 bg-amber-500/20"
                          : "border-white/10 bg-white/[0.04]"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-6">
                <div className="text-xs uppercase tracking-wider text-white/50 mb-2">
                  Détail calcul
                </div>
                <pre className="text-[10px] bg-black/40 rounded-lg p-3 overflow-x-auto">
                  {JSON.stringify(selected.breakdown, null, 2)}
                </pre>
              </div>

              <div className="mt-4">
                <div className="text-xs uppercase tracking-wider text-white/50 mb-2">
                  Données entrantes
                </div>
                <pre className="text-[10px] bg-black/40 rounded-lg p-3 overflow-x-auto">
                  {JSON.stringify(selected.input_payload, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function KPI({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="text-xs uppercase tracking-wider text-white/50">
        {label}
      </div>
      <div className="text-xl font-semibold mt-1">{value}</div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-white/5 py-1.5">
      <span className="text-white/60">{label}</span>
      <span>{value}</span>
    </div>
  );
}
