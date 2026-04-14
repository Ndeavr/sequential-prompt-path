import { Badge } from "@/components/ui/badge";

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  queued: { label: "En file", className: "bg-muted text-muted-foreground" },
  running: { label: "En cours", className: "bg-primary/20 text-primary border-primary/30" },
  completed: { label: "Terminé", className: "bg-success/20 text-success border-success/30" },
  failed: { label: "Échoué", className: "bg-destructive/20 text-destructive border-destructive/30" },
  partial: { label: "Partiel", className: "bg-warning/20 text-warning border-warning/30" },
};

export default function WidgetRunStatus({ status }: { status: string }) {
  const s = STATUS_MAP[status] ?? STATUS_MAP.queued;
  return <Badge className={s.className}>{s.label}</Badge>;
}
