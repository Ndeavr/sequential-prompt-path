/**
 * UNPRO — Table Plan Included Appointments
 * Shows all plans with their included quotas, accessible sizes, and extra pricing.
 */
import { PLAN_ORDER, PLAN_LABELS, PLAN_PRICES, INCLUDED_APPOINTMENTS, BASE_EXTRA_PRICES, PLAN_SIZE_ACCESS } from "@/services/appointmentEconomicsEngine";

export default function TablePlanIncludedAppointments() {
  return (
    <div className="rounded-xl border border-border/40 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border/30 bg-muted/5">
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Plan</th>
              <th className="text-center px-3 py-3 font-semibold text-muted-foreground">Prix/mois</th>
              <th className="text-center px-3 py-3 font-semibold text-muted-foreground">RDV inclus</th>
              <th className="text-center px-3 py-3 font-semibold text-muted-foreground">Unités</th>
              <th className="text-center px-3 py-3 font-semibold text-muted-foreground hidden sm:table-cell">Tailles</th>
              <th className="text-center px-3 py-3 font-semibold text-muted-foreground hidden md:table-cell">Extra base</th>
            </tr>
          </thead>
          <tbody>
            {PLAN_ORDER.map(code => {
              const inc = INCLUDED_APPOINTMENTS[code];
              const sizes = PLAN_SIZE_ACCESS[code];
              return (
                <tr key={code} className="border-b border-border/20 hover:bg-muted/5 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-semibold text-foreground">{PLAN_LABELS[code]}</span>
                  </td>
                  <td className="text-center px-3 py-3 font-mono text-foreground">{PLAN_PRICES[code]}$</td>
                  <td className="text-center px-3 py-3 font-mono text-primary font-bold">{inc.appointments}</td>
                  <td className="text-center px-3 py-3 font-mono text-muted-foreground">{inc.units}</td>
                  <td className="text-center px-3 py-3 hidden sm:table-cell">
                    <div className="flex gap-1 justify-center flex-wrap">
                      {sizes.map(s => (
                        <span key={s} className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[9px] font-bold uppercase">
                          {s}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="text-center px-3 py-3 font-mono text-amber-400 hidden md:table-cell">{BASE_EXTRA_PRICES[code]}$</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
