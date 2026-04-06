/**
 * UNPRO — Table Plan Included Appointments (Live Data)
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
  can_rollover_unused_appointments: boolean;
}
interface SizeAccess {
  plan_code: string;
  project_size_code: string;
  access_allowed: boolean;
  upgrade_target_plan_code: string | null;
}

interface Props {
  plans: PlanDef[];
  included: PlanIncluded[];
  access: SizeAccess[];
  loading: boolean;
}

const SIZE_ORDER = ["xs", "s", "m", "l", "xl", "xxl"];

export default function TablePlanIncludedAppointmentsLive({ plans, included, access, loading }: Props) {
  if (loading) {
    return (
      <div className="rounded-xl border border-border/40 p-8 text-center text-muted-foreground text-sm">
        Chargement des quotas…
      </div>
    );
  }

  const getIncluded = (code: string) => included.find(i => i.plan_code === code);
  const getSizes = (code: string) =>
    SIZE_ORDER.filter(s =>
      access.some(a => a.plan_code === code && a.project_size_code === s && a.access_allowed)
    );

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
              <th className="text-center px-3 py-3 font-semibold text-muted-foreground hidden sm:table-cell">Tailles accessibles</th>
              <th className="text-center px-3 py-3 font-semibold text-muted-foreground hidden md:table-cell">Extra base</th>
              <th className="text-center px-3 py-3 font-semibold text-muted-foreground hidden md:table-cell">Rollover</th>
            </tr>
          </thead>
          <tbody>
            {plans.map(plan => {
              const inc = getIncluded(plan.code);
              const sizes = getSizes(plan.code);
              return (
                <tr key={plan.code} className="border-b border-border/20 hover:bg-muted/5 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-semibold text-foreground">{plan.name}</span>
                    <span className="ml-2 text-[9px] text-muted-foreground">#{plan.rank}</span>
                  </td>
                  <td className="text-center px-3 py-3 font-mono text-foreground">
                    {(plan.base_price_monthly / 100).toFixed(0)}$
                  </td>
                  <td className="text-center px-3 py-3 font-mono text-primary font-bold">
                    {inc?.included_appointments_monthly ?? "—"}
                  </td>
                  <td className="text-center px-3 py-3 font-mono text-muted-foreground">
                    {inc ? Number(inc.included_units_monthly).toFixed(1) : "—"}
                  </td>
                  <td className="text-center px-3 py-3 hidden sm:table-cell">
                    <div className="flex gap-1 justify-center flex-wrap">
                      {sizes.map(s => (
                        <span key={s} className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[9px] font-bold uppercase">
                          {s}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="text-center px-3 py-3 font-mono text-amber-400 hidden md:table-cell">
                    {inc ? `${Number(inc.base_extra_appointment_price).toFixed(0)}$` : "—"}
                  </td>
                  <td className="text-center px-3 py-3 hidden md:table-cell">
                    {inc?.can_rollover_unused_appointments ? (
                      <span className="text-emerald-400 text-[9px]">✓ Oui</span>
                    ) : (
                      <span className="text-muted-foreground text-[9px]">Non</span>
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
