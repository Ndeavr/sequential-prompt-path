import { cn } from "@/lib/utils";
import type { ScarcityStatus } from "@/services/clusterProjectSizeMatrixEngine";

const SCARCITY_STYLES: Record<ScarcityStatus, { label: string; cls: string }> = {
  open: { label: "Ouvert", cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  tight: { label: "Tension", cls: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  rare: { label: "Rare", cls: "bg-orange-500/15 text-orange-400 border-orange-500/30" },
  full: { label: "Complet", cls: "bg-red-500/15 text-red-400 border-red-500/30" },
  locked: { label: "Verrouillé", cls: "bg-purple-500/15 text-purple-400 border-purple-500/30" },
};

interface BadgeScarcityStateProps {
  status: ScarcityStatus;
  className?: string;
}

export default function BadgeScarcityState({ status, className }: BadgeScarcityStateProps) {
  const cfg = SCARCITY_STYLES[status];
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-md border", cfg.cls, className)}>
      {cfg.label}
    </span>
  );
}
