import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const levelConfig: Record<string, { label: string; color: string }> = {
  dominant: { label: "Dominant", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  fort: { label: "Fort", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  moyen: { label: "Moyen", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  faible: { label: "Faible", color: "bg-red-500/20 text-red-400 border-red-500/30" },
  unknown: { label: "—", color: "bg-muted text-muted-foreground" },
};

export function BadgeAIPPLevel({ level, className }: { level: string; className?: string }) {
  const cfg = levelConfig[level] || levelConfig.unknown;
  return (
    <Badge variant="outline" className={cn(cfg.color, "text-xs font-semibold", className)}>
      AIPP · {cfg.label}
    </Badge>
  );
}
