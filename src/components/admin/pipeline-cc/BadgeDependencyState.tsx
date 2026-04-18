import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { DependencyStatus } from "@/services/pipelineCommandCenterService";

const config: Record<DependencyStatus, { label: string; cls: string }> = {
  healthy:  { label: "Sain",    cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  degraded: { label: "Dégradé", cls: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
  failed:   { label: "Échec",   cls: "bg-red-500/15 text-red-300 border-red-500/30" },
  unknown:  { label: "Inconnu", cls: "bg-muted text-muted-foreground border-border" },
};

export default function BadgeDependencyState({ status }: { status: DependencyStatus }) {
  const c = config[status] ?? config.unknown;
  return <Badge variant="outline" className={cn("text-xs font-medium", c.cls)}>{c.label}</Badge>;
}
