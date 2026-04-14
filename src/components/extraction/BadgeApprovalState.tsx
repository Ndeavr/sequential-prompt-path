import { cn } from "@/lib/utils";

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  pending_extraction: { label: "Extraction", className: "bg-muted text-muted-foreground" },
  pending_review: { label: "En revue", className: "bg-warning/20 text-warning" },
  approved: { label: "Approuvé", className: "bg-success/20 text-success" },
  merged: { label: "Fusionné", className: "bg-secondary/20 text-secondary" },
  rejected: { label: "Rejeté", className: "bg-destructive/20 text-destructive" },
  archived: { label: "Archivé", className: "bg-muted text-muted-foreground" },
};

export default function BadgeApprovalState({ status }: { status: string }) {
  const s = STATUS_MAP[status] ?? { label: status, className: "bg-muted text-muted-foreground" };
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider", s.className)}>
      {s.label}
    </span>
  );
}
