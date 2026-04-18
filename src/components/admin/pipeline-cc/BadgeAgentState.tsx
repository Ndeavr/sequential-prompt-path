import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AgentHealthStatus } from "@/services/pipelineCommandCenterService";

const MAP: Record<AgentHealthStatus, { label: string; cls: string }> = {
  healthy:    { label: "Healthy",   cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  degraded:   { label: "Degraded",  cls: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
  stale:      { label: "Stale",     cls: "bg-orange-500/15 text-orange-300 border-orange-500/30" },
  failing:    { label: "Failing",   cls: "bg-red-500/15 text-red-300 border-red-500/30" },
  disabled:   { label: "Off",       cls: "bg-muted/30 text-muted-foreground border-muted" },
  never_ran:  { label: "Never ran", cls: "bg-blue-500/15 text-blue-300 border-blue-500/30" },
  unknown:    { label: "Unknown",   cls: "bg-muted/30 text-muted-foreground border-muted" },
};

export default function BadgeAgentState({ status }: { status: AgentHealthStatus }) {
  const m = MAP[status] ?? MAP.unknown;
  return <Badge variant="outline" className={cn("text-[10px]", m.cls)}>{m.label}</Badge>;
}
