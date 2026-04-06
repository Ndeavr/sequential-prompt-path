/**
 * UNPRO — Table Plan Profitability Matrix (Live Data)
 */

interface PlanDef {
  code: string;
  name: string;
  base_price_monthly: number;
  rank: number;
}
interface PlanIncluded {
  plan_code: string;
  included_appointments_monthly: number;
  included_units_monthly: number;
  base_extra_appointment_price: number;
}

interface Props {
  plans: PlanDef[];
  included: PlanIncluded[];
  loading: boolean;
}

export default function TablePlanProfitabilityMatrixLive({ plans, included, loading }: Props) {
  if (loading) {
    return (
      <div className="rounded-xl border border-border/40 p-8 text-center text-muted-foreground text-sm">
        Chargement de la rentabilité…
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/40 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border/30 bg-muted/5">
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Plan</th>
              <th className="text-center px-3 py-3 font-semibold text-muted-foreground">Abonnement</th>
              <th className="text-center px-3 py-3 font-semibold text-muted-foreground">RDV inclus</th>
              <th className="text-center px-3 py-3 font-semibold text-muted-foreground">Unités</th>
              <th className="text-center px-3 py-3 font-semibold text-muted-foreground hidden sm:table-cell">$/RDV</th>
              <th className="text-center px-3 py-3 font-semibold text-muted-foreground hidden sm:table-cell">$/unité</th>
              <th className="text-center px-3 py-3 font-semibold text-muted-foreground hidden md:table-cell">Base extra</th>
              <th className="text-center px-3 py-3 font-semibold text-primary hidden md:table-cell">Upgrade Δ</th>
            </tr>
          </thead>
          <tbody>
            {plans.map((plan, idx) => {
              const inc = included.find(i => i.plan_code === plan.code);
              const price = plan.base_price_monthly / 100;
              const appts = inc?.included_appointments_monthly ?? 1;
              const units = Number(inc?.included_units_monthly ?? 1);
              const perAppt = price / appts;
              const perUnit = price / units;
              const nextPlan = plans[idx + 1];
              const upgradeDelta = nextPlan ? (nextPlan.base_price_monthly - plan.base_price_monthly) / 100 : null;

              return (
                <tr key={plan.code} className="border-b border-border/20 hover:bg-muted/5 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-semibold text-foreground">{plan.name}</span>
                  </td>
                  <td className="text-center px-3 py-3 font-mono text-foreground">{price.toFixed(0)}$</td>
                  <td className="text-center px-3 py-3 font-mono text-primary font-bold">{appts}</td>
                  <td className="text-center px-3 py-3 font-mono text-muted-foreground">{units.toFixed(1)}</td>
                  <td className="text-center px-3 py-3 font-mono text-emerald-400 hidden sm:table-cell">
                    {perAppt.toFixed(1)}$
                  </td>
                  <td className="text-center px-3 py-3 font-mono text-amber-400 hidden sm:table-cell">
                    {perUnit.toFixed(1)}$
                  </td>
                  <td className="text-center px-3 py-3 font-mono text-muted-foreground hidden md:table-cell">
                    {inc ? `${Number(inc.base_extra_appointment_price).toFixed(0)}$` : "—"}
                  </td>
                  <td className="text-center px-3 py-3 font-mono hidden md:table-cell">
                    {upgradeDelta !== null ? (
                      <span className="text-primary">{upgradeDelta.toFixed(0)}$</span>
                    ) : (
                      <span className="text-muted-foreground text-[9px]">Max</span>
                    )}
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
