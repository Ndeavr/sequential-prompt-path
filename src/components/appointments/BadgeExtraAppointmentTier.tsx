/**
 * UNPRO — Badge Extra Appointment Tier
 */
import { cn } from "@/lib/utils";
import type { ProjectSizeCode } from "@/services/appointmentEconomicsEngine";

const SIZE_COLORS: Record<ProjectSizeCode, string> = {
  xs: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  s: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  m: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  l: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  xl: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  xxl: "bg-red-500/10 text-red-400 border-red-500/20",
};

interface BadgeExtraAppointmentTierProps {
  sizeCode: ProjectSizeCode;
  className?: string;
}

export default function BadgeExtraAppointmentTier({ sizeCode, className }: BadgeExtraAppointmentTierProps) {
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border uppercase", SIZE_COLORS[sizeCode], className)}>
      {sizeCode.toUpperCase()}
    </span>
  );
}
