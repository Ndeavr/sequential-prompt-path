import { cn } from "@/lib/utils";
import type { ProjectSizeDefinition } from "@/services/clusterProjectSizeMatrixEngine";

interface Props {
  size: ProjectSizeDefinition;
  slots: number;
  occupied: number;
  revenue: number;
  className?: string;
}

const fmt = (n: number) => new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(n);

export default function CardProjectSizeSummary({ size, slots, occupied, revenue, className }: Props) {
  const pct = slots > 0 ? Math.round((occupied / slots) * 100) : 0;
  return (
    <div className={cn("rounded-xl border border-border bg-card p-4 space-y-2", className)}>
      <div className="flex items-center justify-between">
        <span className="text-lg font-bold text-foreground">{size.label}</span>
        <span className="text-xs text-muted-foreground">{fmt(size.min_project_value)} — {size.max_project_value ? fmt(size.max_project_value) : "∞"}</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{occupied}/{slots} slots ({pct}%)</span>
        <span className="font-mono text-foreground">{fmt(revenue)}/an</span>
      </div>
    </div>
  );
}
