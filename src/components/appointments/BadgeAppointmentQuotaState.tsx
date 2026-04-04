/**
 * UNPRO — Badge Appointment Quota State
 */
import { cn } from "@/lib/utils";
import type { QuotaState } from "@/services/appointmentEconomicsEngine";

interface BadgeAppointmentQuotaStateProps {
  state: QuotaState;
  className?: string;
}

const CONFIG: Record<QuotaState, { label: string; classes: string; dot: string }> = {
  normal: {
    label: "Normal",
    classes: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    dot: "bg-emerald-400",
  },
  warning: {
    label: "Presque épuisé",
    classes: "bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse",
    dot: "bg-amber-400",
  },
  exceeded: {
    label: "Dépassé",
    classes: "bg-red-500/10 text-red-400 border-red-500/20",
    dot: "bg-red-400",
  },
  blocked: {
    label: "Bloqué",
    classes: "bg-red-500/10 text-red-300 border-red-500/20",
    dot: "bg-red-300",
  },
};

export default function BadgeAppointmentQuotaState({ state, className }: BadgeAppointmentQuotaStateProps) {
  const cfg = CONFIG[state];
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border uppercase tracking-wider", cfg.classes, className)}>
      <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />
      {cfg.label}
    </span>
  );
}
