import { Badge } from "@/components/ui/badge";

const MAP: Record<string, { label: string; className: string }> = {
  draft: { label: "Brouillon", className: "bg-muted text-muted-foreground" },
  pending: { label: "En attente", className: "bg-warning/20 text-warning" },
  approved: { label: "Approuvé", className: "bg-success/20 text-success" },
  auto_approved: { label: "Auto-approuvé", className: "bg-primary/20 text-primary" },
  rejected: { label: "Rejeté", className: "bg-destructive/20 text-destructive" },
  queued: { label: "En file", className: "bg-primary/20 text-primary" },
  sent: { label: "Envoyé", className: "bg-success/20 text-success" },
  failed: { label: "Échoué", className: "bg-destructive/20 text-destructive" },
  bounced: { label: "Bounced", className: "bg-destructive/20 text-destructive" },
};

export default function WidgetEmailStateBadge({ status }: { status: string }) {
  const s = MAP[status] ?? MAP.draft;
  return <Badge className={s.className}>{s.label}</Badge>;
}
