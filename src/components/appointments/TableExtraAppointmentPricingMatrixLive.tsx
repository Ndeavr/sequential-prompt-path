/**
 * UNPRO — Table Extra Appointment Pricing Matrix (Live Data)
 */
import { useState } from "react";

interface PricingRule {
  id: string;
  plan_code: string;
  project_size_code: string;
  cluster_value_tier: string;
  scarcity_status: string;
  base_extra_price: number;
  size_multiplier: number;
  scarcity_multiplier: number;
  cluster_value_multiplier: number;
  monetization_floor_factor: number;
  computed_final_price: number | null;
  is_active: boolean;
  updated_at: string;
}

interface Props {
  pricing: PricingRule[];
  loading: boolean;
}

const PLAN_LABELS: Record<string, string> = {
  recrue: "Recrue", pro: "Pro", premium: "Premium", elite: "Élite", signature: "Signature",
};

const SCARCITY_COLORS: Record<string, string> = {
  open: "text-emerald-400", tight: "text-yellow-400", rare: "text-orange-400", full: "text-red-400", locked: "text-red-500",
};

export default function TableExtraAppointmentPricingMatrixLive({ pricing, loading }: Props) {
  const [filterPlan, setFilterPlan] = useState<string>("all");
  const [filterSize, setFilterSize] = useState<string>("all");

  if (loading) {
    return (
      <div className="rounded-xl border border-border/40 p-8 text-center text-muted-foreground text-sm">
        Chargement de la matrice de tarification…
      </div>
    );
  }

  const plans = [...new Set(pricing.map(p => p.plan_code))];
  const sizes = [...new Set(pricing.map(p => p.project_size_code))];

  const filtered = pricing.filter(r =>
    (filterPlan === "all" || r.plan_code === filterPlan) &&
    (filterSize === "all" || r.project_size_code === filterSize)
  );

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <select
          value={filterPlan}
          onChange={e => setFilterPlan(e.target.value)}
          className="rounded-lg bg-card border border-border/30 text-xs px-3 py-1.5 text-foreground"
        >
          <option value="all">Tous les plans</option>
          {plans.map(p => <option key={p} value={p}>{PLAN_LABELS[p] || p}</option>)}
        </select>
        <select
          value={filterSize}
          onChange={e => setFilterSize(e.target.value)}
          className="rounded-lg bg-card border border-border/30 text-xs px-3 py-1.5 text-foreground"
        >
          <option value="all">Toutes les tailles</option>
          {sizes.map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
        </select>
        <span className="text-[10px] text-muted-foreground self-center ml-auto">{filtered.length} règles</span>
      </div>

      <div className="rounded-xl border border-border/40 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/30 bg-muted/5">
                <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground">Plan</th>
                <th className="text-center px-2 py-2.5 font-semibold text-muted-foreground">Size</th>
                <th className="text-center px-2 py-2.5 font-semibold text-muted-foreground hidden sm:table-cell">Rareté</th>
                <th className="text-center px-2 py-2.5 font-semibold text-muted-foreground hidden sm:table-cell">Cluster</th>
                <th className="text-center px-2 py-2.5 font-semibold text-muted-foreground">Base</th>
                <th className="text-center px-2 py-2.5 font-semibold text-muted-foreground hidden md:table-cell">×Size</th>
                <th className="text-center px-2 py-2.5 font-semibold text-muted-foreground hidden md:table-cell">×Rareté</th>
                <th className="text-center px-2 py-2.5 font-semibold text-muted-foreground hidden md:table-cell">×Cluster</th>
                <th className="text-right px-3 py-2.5 font-semibold text-primary">Final</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id} className="border-b border-border/20 hover:bg-muted/5 transition-colors">
                  <td className="px-3 py-2.5 font-semibold text-foreground">{PLAN_LABELS[r.plan_code] || r.plan_code}</td>
                  <td className="text-center px-2 py-2.5">
                    <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[9px] font-bold uppercase">
                      {r.project_size_code}
                    </span>
                  </td>
                  <td className={`text-center px-2 py-2.5 text-[10px] font-medium hidden sm:table-cell ${SCARCITY_COLORS[r.scarcity_status] || ""}`}>
                    {r.scarcity_status}
                  </td>
                  <td className="text-center px-2 py-2.5 text-[10px] text-muted-foreground hidden sm:table-cell">
                    {r.cluster_value_tier}
                  </td>
                  <td className="text-center px-2 py-2.5 font-mono text-muted-foreground">
                    {Number(r.base_extra_price).toFixed(0)}$
                  </td>
                  <td className="text-center px-2 py-2.5 font-mono text-muted-foreground hidden md:table-cell">
                    {Number(r.size_multiplier).toFixed(2)}
                  </td>
                  <td className="text-center px-2 py-2.5 font-mono text-muted-foreground hidden md:table-cell">
                    {Number(r.scarcity_multiplier).toFixed(2)}
                  </td>
                  <td className="text-center px-2 py-2.5 font-mono text-muted-foreground hidden md:table-cell">
                    {Number(r.cluster_value_multiplier).toFixed(2)}
                  </td>
                  <td className="text-right px-3 py-2.5 font-mono font-bold text-primary">
                    {r.computed_final_price ? `${Number(r.computed_final_price).toFixed(2)}$` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
