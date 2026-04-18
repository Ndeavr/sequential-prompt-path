import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { RunNormalizedStatus } from "@/services/pipelineCommandCenterService";

const config: Record<RunNormalizedStatus, { label: string; cls: string }> = {
  queued:          { label: "En file",   cls: "bg-blue-500/15 text-blue-300 border-blue-500/30" },
  running:         { label: "En cours",  cls: "bg-primary/15 text-primary border-primary/30" },
  blocked:         { label: "Bloqué",    cls: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
  failed:          { label: "Échoué",    cls: "bg-red-500/15 text-red-300 border-red-500/30" },
  succeeded:       { label: "Réussi",    cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  partial_success: { label: "Partiel",   cls: "bg-orange-500/15 text-orange-300 border-orange-500/30" },
  cancelled:       { label: "Annulé",    cls: "bg-muted text-muted-foreground border-border" },
  unknown:         { label: "—",         cls: "bg-muted text-muted-foreground border-border" },
};

export default function BadgeRunState({ status }: { status: RunNormalizedStatus }) {
  const c = config[status] ?? config.unknown;
  return <Badge variant="outline" className={cn("text-xs font-medium", c.cls)}>{c.label}</Badge>;
}
