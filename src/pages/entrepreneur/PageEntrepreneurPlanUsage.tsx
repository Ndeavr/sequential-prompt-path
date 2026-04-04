/**
 * UNPRO — Entrepreneur Plan Usage Page
 * Shows current month usage, extra appointments, upgrade recommendations.
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { CalendarDays, TrendingUp, ArrowUpRight } from "lucide-react";
import PanelPlanUsageSummary from "@/components/appointments/PanelPlanUsageSummary";
import WidgetPlanAppointmentQuota from "@/components/appointments/WidgetPlanAppointmentQuota";
import WidgetExtraAppointmentCost from "@/components/appointments/WidgetExtraAppointmentCost";
import TablePlanIncludedAppointments from "@/components/appointments/TablePlanIncludedAppointments";
import { simulateMonthlyUsage, PLAN_LABELS, PLAN_ORDER } from "@/services/appointmentEconomicsEngine";
import type { PlanCode, ProjectSizeCode } from "@/services/appointmentEconomicsEngine";

// Demo data for preview
const DEMO_PLAN: PlanCode = "premium";
const DEMO_APPOINTMENTS: { size: ProjectSizeCode; count: number }[] = [
  { size: "s", count: 8 },
  { size: "m", count: 4 },
  { size: "l", count: 3 },
];

export default function PageEntrepreneurPlanUsage() {
  const [selectedPlan, setSelectedPlan] = useState<PlanCode>(DEMO_PLAN);
  const sim = simulateMonthlyUsage(selectedPlan, DEMO_APPOINTMENTS, "rare", "high");

  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <main className="p-4 lg:p-6 max-w-4xl mx-auto space-y-5">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <h1 className="font-display text-xl font-bold text-foreground">Mon usage</h1>
            <span className="px-2 py-0.5 rounded-full bg-primary/15 text-primary text-[10px] font-semibold">{PLAN_LABELS[selectedPlan]}</span>
          </div>
          <p className="text-sm text-muted-foreground">Suivi de vos rendez-vous, quota et dépassements</p>
        </div>

        {/* Plan selector (demo) */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {PLAN_ORDER.map(p => (
            <button
              key={p}
              onClick={() => setSelectedPlan(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                selectedPlan === p
                  ? "bg-primary/15 text-primary border-primary/20"
                  : "text-muted-foreground hover:text-foreground border-transparent hover:bg-muted/20"
              }`}
            >
              {PLAN_LABELS[p]}
            </button>
          ))}
        </div>

        <motion.div
          key={selectedPlan}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="space-y-5"
        >
          {/* Main usage panel */}
          <PanelPlanUsageSummary
            planCode={selectedPlan}
            consumedUnits={sim.total_units_consumed}
            consumedAppointments={sim.total_appointments}
            extraAppointments={sim.extra_appointments_count}
            overageAmount={sim.extra_cost}
          />

          {/* Widgets row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <WidgetPlanAppointmentQuota
              planCode={selectedPlan}
              consumedUnits={sim.total_units_consumed}
              consumedAppointments={sim.total_appointments}
            />
            <WidgetExtraAppointmentCost
              extraCount={sim.extra_appointments_count}
              totalCost={sim.extra_cost}
            />
          </div>

          {/* Breakdown */}
          <div className="rounded-xl border border-border/30 bg-card/50 p-5">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-primary" />
              Détail des rendez-vous ce mois
            </h3>
            <div className="space-y-2">
              {sim.appointments.map(({ size, count }) => {
                const units = ({ xs: 0.5, s: 1.0, m: 1.5, l: 2.0, xl: 3.0, xxl: 5.0 })[size];
                return (
                  <div key={size} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/5 border border-border/20">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-bold uppercase">{size}</span>
                      <span className="text-xs text-muted-foreground">{count} rendez-vous</span>
                    </div>
                    <span className="text-xs font-mono text-foreground">{(count * units).toFixed(1)} unités</span>
                  </div>
                );
              })}
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-primary/5 border border-primary/20 mt-2">
                <span className="text-xs font-semibold text-primary">Total consommé</span>
                <span className="text-sm font-bold font-mono text-primary">{sim.total_units_consumed.toFixed(1)} unités</span>
              </div>
            </div>
          </div>

          {/* Upgrade suggestion */}
          {sim.upgrade?.should_recommend && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg border border-amber-500/20 bg-amber-500/10">
                  <ArrowUpRight className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-amber-400">Passez au plan supérieur</h4>
                  <p className="text-xs text-muted-foreground mt-1">{sim.upgrade.message}</p>
                  <button className="mt-3 text-xs font-semibold px-4 py-2 rounded-lg border border-amber-500/20 text-amber-400 hover:bg-amber-500/10 transition-all">
                    Voir le plan {PLAN_LABELS[sim.upgrade.next_plan]}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Plan reference */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Comparaison des plans</h3>
            <TablePlanIncludedAppointments />
          </div>
        </motion.div>
      </main>
    </div>
  );
}
