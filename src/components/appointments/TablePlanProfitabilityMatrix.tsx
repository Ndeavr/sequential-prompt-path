/**
 * UNPRO — Table Plan Profitability Matrix
 */
import { buildProfitabilityMatrix, PLAN_LABELS } from "@/services/appointmentEconomicsEngine";

export default function TablePlanProfitabilityMatrix() {
  const matrix = buildProfitabilityMatrix();

  return (
    <div className="rounded-xl border border-border/40 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border/30 bg-muted/5">
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Plan</th>
              <th className="text-center px-3 py-3 font-semibold text-muted-foreground">Prix</th>
              <th className="text-center px-3 py-3 font-semibold text-muted-foreground">RDV</th>
              <th className="text-center px-3 py-3 font-semibold text-muted-foreground">Unités</th>
              <th className="text-center px-3 py-3 font-semibold text-muted-foreground hidden sm:table-cell">$/RDV</th>
              <th className="text-center px-3 py-3 font-semibold text-muted-foreground hidden sm:table-cell">$/Unité</th>
              <th className="text-center px-3 py-3 font-semibold text-muted-foreground hidden md:table-cell">Extra base</th>
              <th className="text-center px-3 py-3 font-semibold text-muted-foreground hidden md:table-cell">Tailles</th>
            </tr>
          </thead>
          <tbody>
            {matrix.map(row => {
              const perAppt = row.monthly_price / row.included_appointments;
              const perUnit = row.monthly_price / row.included_units;
              return (
                <tr key={row.plan_code} className="border-b border-border/20 hover:bg-muted/5 transition-colors">
                  <td className="px-4 py-3 font-semibold text-foreground">{row.plan_label}</td>
                  <td className="text-center px-3 py-3 font-mono text-foreground">{row.monthly_price}$</td>
                  <td className="text-center px-3 py-3 font-mono text-primary font-bold">{row.included_appointments}</td>
                  <td className="text-center px-3 py-3 font-mono text-muted-foreground">{row.included_units}</td>
                  <td className="text-center px-3 py-3 font-mono text-emerald-400 hidden sm:table-cell">{perAppt.toFixed(0)}$</td>
                  <td className="text-center px-3 py-3 font-mono text-emerald-400 hidden sm:table-cell">{perUnit.toFixed(0)}$</td>
                  <td className="text-center px-3 py-3 font-mono text-amber-400 hidden md:table-cell">{row.base_extra_price}$</td>
                  <td className="text-center px-3 py-3 hidden md:table-cell">
                    <div className="flex gap-0.5 justify-center">
                      {row.accessible_sizes.map(s => (
                        <span key={s} className="px-1 py-0.5 rounded bg-primary/10 text-primary text-[8px] font-bold uppercase">{s}</span>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
