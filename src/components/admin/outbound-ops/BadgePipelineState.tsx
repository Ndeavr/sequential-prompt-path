import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const stateConfig: Record<string, { label: string; className: string }> = {
  healthy: { label: "Sain", className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  warning: { label: "Attention", className: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  degraded: { label: "Dégradé", className: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  failed: { label: "Échoué", className: "bg-red-500/20 text-red-400 border-red-500/30" },
  paused: { label: "En pause", className: "bg-muted text-muted-foreground border-border" },
  unknown: { label: "Inconnu", className: "bg-muted text-muted-foreground border-border" },
  pending: { label: "En attente", className: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  running: { label: "En cours", className: "bg-primary/20 text-primary border-primary/30" },
  completed: { label: "Complété", className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  queued: { label: "En file", className: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  cancelled: { label: "Annulé", className: "bg-muted text-muted-foreground border-border" },
};

export default function BadgePipelineState({ state }: { state: string }) {
  const cfg = stateConfig[state] || stateConfig.unknown;
  return <Badge variant="outline" className={cn("text-xs font-medium", cfg.className)}>{cfg.label}</Badge>;
}
