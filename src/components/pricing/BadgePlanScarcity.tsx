/**
 * UNPRO — Badge Plan Scarcity
 * Visual indicator for slot scarcity status.
 */
import { cn } from "@/lib/utils";
import type { ScarcityStatus } from "@/services/planCapacityEngine";

interface BadgePlanScarcityProps {
  status: ScarcityStatus;
  remaining?: number;
  className?: string;
}

const CONFIG: Record<ScarcityStatus, { label: string; classes: string; dot: string }> = {
  open: {
    label: "Disponible",
    classes: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    dot: "bg-emerald-400",
  },
  tight: {
    label: "Limité",
    classes: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    dot: "bg-amber-400",
  },
  rare: {
    label: "Rare",
    classes: "bg-orange-500/10 text-orange-400 border-orange-500/20 animate-pulse",
    dot: "bg-orange-400",
  },
  full: {
    label: "Complet",
    classes: "bg-red-500/10 text-red-400 border-red-500/20",
    dot: "bg-red-400",
  },
  locked: {
    label: "Exclusif",
    classes: "bg-purple-500/10 text-purple-300 border-purple-500/20",
    dot: "bg-purple-400",
  },
};

export default function BadgePlanScarcity({ status, remaining, className }: BadgePlanScarcityProps) {
  const cfg = CONFIG[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border uppercase tracking-wider",
        cfg.classes,
        className
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />
      {cfg.label}
      {remaining !== undefined && remaining > 0 && status !== "full" && status !== "locked" && (
        <span className="opacity-70">· {remaining}</span>
      )}
    </span>
  );
}
