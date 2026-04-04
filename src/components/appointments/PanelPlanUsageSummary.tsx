/**
 * UNPRO — Panel Plan Usage Summary
 * Shows entrepreneur's current month usage with progress and overage.
 */
import { CalendarDays, Zap, AlertTriangle, TrendingUp } from "lucide-react";
import ProgressBarAppointmentUsage from "./ProgressBarAppointmentUsage";
import BadgeAppointmentQuotaState from "./BadgeAppointmentQuotaState";
import { computeQuotaState, computeUpgradeBreakEven, PLAN_LABELS, PLAN_PRICES, INCLUDED_APPOINTMENTS } from "@/services/appointmentEconomicsEngine";
import type { PlanCode } from "@/services/appointmentEconomicsEngine";

interface PanelPlanUsageSummaryProps {
  planCode: PlanCode;
  consumedUnits: number;
  consumedAppointments: number;
  extraAppointments: number;
  overageAmount: number;
}

export default function PanelPlanUsageSummary({
  planCode,
  consumedUnits,
  consumedAppointments,
  extraAppointments,
  overageAmount,
}: PanelPlanUsageSummaryProps) {
  const inc = INCLUDED_APPOINTMENTS[planCode];
  const quotaState = computeQuotaState(consumedUnits, inc.units);
  const upgrade = computeUpgradeBreakEven(planCode, overageAmount);

  return (
    <div className="rounded-xl border border-border/40 bg-card/50 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm">Usage mensuel — {PLAN_LABELS[planCode]}</h3>
        </div>
        <BadgeAppointmentQuotaState state={quotaState} />
      </div>

      <ProgressBarAppointmentUsage consumed={consumedUnits} included={inc.units} />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "RDV inclus", value: `${consumedAppointments}/${inc.appointments}`, icon: CalendarDays, color: "text-primary" },
          { label: "Unités", value: `${consumedUnits.toFixed(1)}/${inc.units}`, icon: Zap, color: "text-amber-400" },
          { label: "Extra", value: extraAppointments.toString(), icon: AlertTriangle, color: extraAppointments > 0 ? "text-red-400" : "text-muted-foreground" },
          { label: "Coût extra", value: `${overageAmount.toFixed(0)}$`, icon: TrendingUp, color: overageAmount > 0 ? "text-red-400" : "text-emerald-400" },
        ].map(kpi => (
          <div key={kpi.label} className="p-3 rounded-lg border border-border/20 bg-muted/5">
            <div className="flex items-center gap-1.5 mb-1">
              <kpi.icon className={`w-3 h-3 ${kpi.color}`} />
              <span className="text-[10px] text-muted-foreground">{kpi.label}</span>
            </div>
            <p className={`text-lg font-bold font-mono ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {upgrade?.should_recommend && (
        <div className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/5">
          <div className="flex items-start gap-2">
            <TrendingUp className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-amber-400">Upgrade recommandé</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{upgrade.message}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
