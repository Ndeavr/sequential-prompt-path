/**
 * UNPRO — Table Extra Appointment Pricing Matrix
 */
import { useState } from "react";
import { buildExtraPricingMatrix, PLAN_ORDER, PLAN_LABELS } from "@/services/appointmentEconomicsEngine";
import type { ExtraPricingMatrixRow } from "@/services/appointmentEconomicsEngine";
import BadgeExtraAppointmentTier from "./BadgeExtraAppointmentTier";
import { Lock, ArrowUpRight } from "lucide-react";

export default function TableExtraAppointmentPricingMatrix() {
  const [scarcity, setScarcity] = useState("open");
  const [tier, setTier] = useState("medium");
  const [planFilter, setPlanFilter] = useState<string>("all");

  const matrix = buildExtraPricingMatrix(scarcity, tier);
  const filtered = planFilter === "all" ? matrix : matrix.filter(r => r.plan_code === planFilter);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select
          value={planFilter}
          onChange={e => setPlanFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-border/30 bg-card text-xs text-foreground"
        >
          <option value="all">Tous les plans</option>
          {PLAN_ORDER.map(p => (
            <option key={p} value={p}>{PLAN_LABELS[p]}</option>
          ))}
        </select>
        <select
          value={scarcity}
          onChange={e => setScarcity(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-border/30 bg-card text-xs text-foreground"
        >
          {["open", "tight", "rare", "full", "locked"].map(s => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
        <select
          value={tier}
          onChange={e => setTier(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-border/30 bg-card text-xs text-foreground"
        >
          {["low", "medium", "high", "elite"].map(t => (
            <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border/40 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/30 bg-muted/5">
                <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground">Plan</th>
                <th className="text-center px-2 py-2.5 font-semibold text-muted-foreground">Taille</th>
                <th className="text-center px-2 py-2.5 font-semibold text-muted-foreground">Accès</th>
                <th className="text-center px-2 py-2.5 font-semibold text-muted-foreground hidden sm:table-cell">Base</th>
                <th className="text-center px-2 py-2.5 font-semibold text-muted-foreground hidden sm:table-cell">×Size</th>
                <th className="text-center px-2 py-2.5 font-semibold text-muted-foreground hidden md:table-cell">×Rareté</th>
                <th className="text-center px-2 py-2.5 font-semibold text-muted-foreground hidden md:table-cell">×Cluster</th>
                <th className="text-center px-2 py-2.5 font-semibold text-muted-foreground">Prix final</th>
                <th className="text-center px-2 py-2.5 font-semibold text-muted-foreground hidden sm:table-cell">Upgrade</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, i) => (
                <tr key={i} className="border-b border-border/20 hover:bg-muted/5 transition-colors">
                  <td className="px-3 py-2.5 font-semibold text-foreground">{row.plan_label}</td>
                  <td className="text-center px-2 py-2.5">
                    <BadgeExtraAppointmentTier sizeCode={row.size_code} />
                  </td>
                  <td className="text-center px-2 py-2.5">
                    {row.access_allowed ? (
                      <span className="text-emerald-400 text-[10px] font-bold">✓</span>
                    ) : (
                      <Lock className="w-3 h-3 text-red-400/60 mx-auto" />
                    )}
                  </td>
                  <td className="text-center px-2 py-2.5 font-mono text-muted-foreground hidden sm:table-cell">{row.base_extra_price}$</td>
                  <td className="text-center px-2 py-2.5 font-mono text-muted-foreground hidden sm:table-cell">×{row.size_multiplier}</td>
                  <td className="text-center px-2 py-2.5 font-mono text-muted-foreground hidden md:table-cell">×{row.scarcity_multiplier}</td>
                  <td className="text-center px-2 py-2.5 font-mono text-muted-foreground hidden md:table-cell">×{row.cluster_value_multiplier}</td>
                  <td className="text-center px-2 py-2.5">
                    {row.access_allowed ? (
                      <span className="font-mono font-bold text-primary">{row.final_price.toFixed(0)}$</span>
                    ) : (
                      <span className="text-muted-foreground/40">—</span>
                    )}
                  </td>
                  <td className="text-center px-2 py-2.5 hidden sm:table-cell">
                    {row.upgrade_target && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-amber-400 font-medium">
                        <ArrowUpRight className="w-3 h-3" />
                        {PLAN_LABELS[row.upgrade_target]}
                      </span>
                    )}
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
