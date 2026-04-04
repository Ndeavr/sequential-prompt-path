/**
 * UNPRO — Widget Extra Appointment Cost
 */
import { DollarSign } from "lucide-react";

interface WidgetExtraAppointmentCostProps {
  extraCount: number;
  totalCost: number;
}

export default function WidgetExtraAppointmentCost({ extraCount, totalCost }: WidgetExtraAppointmentCostProps) {
  return (
    <div className="rounded-xl border border-border/30 bg-card/50 p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="p-1.5 rounded-lg bg-red-500/10 border border-red-500/20">
          <DollarSign className="w-3.5 h-3.5 text-red-400" />
        </div>
        <span className="text-xs text-muted-foreground">Extra ce mois</span>
      </div>
      <p className="text-2xl font-bold font-mono text-red-400">{totalCost.toFixed(0)}$</p>
      <p className="text-[10px] text-muted-foreground mt-1">{extraCount} rendez-vous hors quota</p>
    </div>
  );
}
