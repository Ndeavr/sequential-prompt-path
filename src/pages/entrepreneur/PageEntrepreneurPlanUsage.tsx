/**
 * UNPRO — Entrepreneur Plan Usage Page (Live Data)
 */
import { motion } from "framer-motion";
import { CalendarDays, TrendingUp, ArrowUpRight, Zap, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePlanDefinitions, usePlanIncludedAppointments, usePlanProjectSizeAccess, useEntrepreneurUsage, useEntrepreneurExtras, getUpgradeBreakEven } from "@/hooks/useAppointmentEconomics";
import BadgeAppointmentQuotaState from "@/components/appointments/BadgeAppointmentQuotaState";
import ProgressBarAppointmentUsage from "@/components/appointments/ProgressBarAppointmentUsage";

const DEMO_CONTRACTOR_ID = "cccccccc-0001-0001-0001-000000000001";

export default function PageEntrepreneurPlanUsage() {
  const { data: plans } = usePlanDefinitions();
  const { data: included } = usePlanIncludedAppointments();
  const { data: access } = usePlanProjectSizeAccess();
  const { data: usage, isLoading } = useEntrepreneurUsage(DEMO_CONTRACTOR_ID);
  const { data: extras } = useEntrepreneurExtras(DEMO_CONTRACTOR_ID);

  const current = usage?.[0];
  const currentInc = included?.find(i => i.plan_code === current?.plan_code);
  const planDef = plans?.find(p => p.code === current?.plan_code);
  const consumedPct = current && currentInc ? (Number(current.consumed_units) / Number(currentInc.included_units_monthly)) * 100 : 0;
  const quotaState = consumedPct >= 100 ? "exceeded" : consumedPct >= 80 ? "warning" : "normal";
  const upgrade = current && plans ? getUpgradeBreakEven(plans.map(p => ({ code: p.code, base_price_monthly: p.base_price_monthly, rank: p.rank })), current.plan_code, Number(current.overage_amount)) : null;
  const sizes = access?.filter(a => a.plan_code === current?.plan_code && a.access_allowed).map(a => a.project_size_code) ?? [];

  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <main className="p-4 lg:p-6 max-w-4xl mx-auto space-y-5">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <h1 className="font-display text-xl font-bold text-foreground">Mon utilisation</h1>
            {current && <BadgeAppointmentQuotaState state={quotaState} />}
          </div>
          <p className="text-sm text-muted-foreground">{planDef ? `Plan ${planDef.name}` : "Chargement…"} — cycle en cours</p>
        </div>
        {isLoading ? (
          <div className="text-center text-muted-foreground py-12 text-sm">Chargement…</div>
        ) : !current ? (
          <div className="text-center text-muted-foreground py-12">
            <p className="text-sm mb-2">Aucun cycle de facturation actif</p>
            <p className="text-xs">Activez un plan pour voir votre utilisation</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: "RDV consommés", value: current.consumed_appointments_count, sub: `/ ${currentInc?.included_appointments_monthly ?? "?"}`, icon: CalendarDays, color: "text-primary" },
                { label: "Unités", value: Number(current.consumed_units).toFixed(1), sub: `/ ${currentInc ? Number(currentInc.included_units_monthly).toFixed(1) : "?"}`, icon: Zap, color: consumedPct >= 80 ? "text-accent" : "text-primary" },
                { label: "RDV extra", value: current.overage_appointments_count, sub: "", icon: ArrowUpRight, color: current.overage_appointments_count > 0 ? "text-destructive" : "text-muted-foreground" },
                { label: "Coût extra", value: `${Number(current.overage_amount).toFixed(0)}$`, sub: "", icon: TrendingUp, color: Number(current.overage_amount) > 0 ? "text-destructive" : "text-primary" },
              ].map(kpi => (
                <div key={kpi.label} className="rounded-xl border border-border/30 bg-card/50 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <kpi.icon className={`w-3.5 h-3.5 ${kpi.color}`} />
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{kpi.label}</span>
                  </div>
                  <p className={`text-2xl font-bold font-mono ${kpi.color}`}>{kpi.value}{kpi.sub && <span className="text-sm text-muted-foreground ml-1">{kpi.sub}</span>}</p>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-border/30 bg-card/50 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">Quota mensuel</span>
                <span className="text-xs font-mono text-foreground">{consumedPct.toFixed(0)}%</span>
              </div>
              <ProgressBarAppointmentUsage percentage={Math.min(consumedPct, 100)} state={quotaState} />
              <div className="flex justify-between mt-2 text-[10px] text-muted-foreground">
                <span>{Number(current.consumed_units).toFixed(1)} unités utilisées</span>
                <span>{Number(current.remaining_units).toFixed(1)} restantes</span>
              </div>
            </div>
            <div className="rounded-xl border border-border/30 bg-card/50 p-4">
              <p className="text-xs text-muted-foreground mb-2">Tailles accessibles</p>
              <div className="flex gap-1.5 flex-wrap">
                {["xs","s","m","l","xl","xxl"].map(s => (
                  <span key={s} className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${sizes.includes(s) ? "bg-primary/10 text-primary border border-primary/20" : "bg-muted/20 text-muted-foreground/50 border border-border/20 line-through"}`}>{s}</span>
                ))}
              </div>
            </div>
            {upgrade?.should_recommend && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-foreground mb-1">Upgrade recommandé</p>
                    <p className="text-xs text-muted-foreground mb-3">{upgrade.message}</p>
                    <Button size="sm" className="text-xs">Passer au plan {upgrade.next_plan}</Button>
                  </div>
                </div>
              </motion.div>
            )}
            {extras && extras.length > 0 && (
              <div className="rounded-xl border border-border/40 overflow-hidden">
                <div className="px-4 py-3 border-b border-border/30 bg-muted/5">
                  <p className="text-xs font-semibold text-foreground">Rendez-vous extra ({extras.length})</p>
                </div>
                <div className="divide-y divide-border/20">
                  {extras.slice(0, 10).map(ex => (
                    <div key={ex.id} className="px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[9px] font-bold uppercase">{ex.project_size_code}</span>
                        <span className="text-xs text-muted-foreground">{Number(ex.units_consumed).toFixed(1)} u.</span>
                      </div>
                      <span className="font-mono text-xs text-destructive">{Number(ex.extra_price).toFixed(0)}$</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
