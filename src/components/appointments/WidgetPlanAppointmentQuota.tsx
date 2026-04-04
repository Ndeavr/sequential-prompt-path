/**
 * UNPRO — Widget Plan Appointment Quota
 * Compact widget showing current quota status.
 */
import { CalendarDays } from "lucide-react";
import { PLAN_LABELS, INCLUDED_APPOINTMENTS, computeQuotaState } from "@/services/appointmentEconomicsEngine";
import type { PlanCode } from "@/services/appointmentEconomicsEngine";
import BadgeAppointmentQuotaState from "./BadgeAppointmentQuotaState";
import ProgressBarAppointmentUsage from "./ProgressBarAppointmentUsage";

interface WidgetPlanAppointmentQuotaProps {
  planCode: PlanCode;
  consumedUnits: number;
  consumedAppointments: number;
}

export default function WidgetPlanAppointmentQuota({ planCode, consumedUnits, consumedAppointments }: WidgetPlanAppointmentQuotaProps) {
  const inc = INCLUDED_APPOINTMENTS[planCode];
  const state = computeQuotaState(consumedUnits, inc.units);

  return (
    <div className="rounded-xl border border-border/30 bg-card/50 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold">{PLAN_LABELS[planCode]}</span>
        </div>
        <BadgeAppointmentQuotaState state={state} />
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-2xl font-bold font-mono text-foreground">{consumedAppointments}</span>
        <span className="text-sm text-muted-foreground">/ {inc.appointments} RDV</span>
      </div>
      <ProgressBarAppointmentUsage consumed={consumedUnits} included={inc.units} />
    </div>
  );
}
