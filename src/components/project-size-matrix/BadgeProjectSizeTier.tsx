import { cn } from "@/lib/utils";
import type { ProjectSizeCode } from "@/services/clusterProjectSizeMatrixEngine";

const SIZE_COLORS: Record<ProjectSizeCode, string> = {
  xs: "bg-slate-500/20 text-slate-300 border-slate-500/30",
  s: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  m: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  l: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  xl: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  xxl: "bg-rose-500/20 text-rose-300 border-rose-500/30",
};

interface BadgeProjectSizeTierProps {
  size: ProjectSizeCode;
  className?: string;
}

export default function BadgeProjectSizeTier({ size, className }: BadgeProjectSizeTierProps) {
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 text-xs font-bold rounded-md border", SIZE_COLORS[size], className)}>
      {size.toUpperCase()}
    </span>
  );
}
