import { cn } from "@/lib/utils";

const SIZE_CONFIG: Record<string, { label: string; color: string }> = {
  XS: { label: "XS", color: "bg-muted text-muted-foreground" },
  S: { label: "S", color: "bg-muted text-muted-foreground" },
  M: { label: "M", color: "bg-primary/15 text-primary" },
  L: { label: "L", color: "bg-accent/15 text-accent" },
  XL: { label: "XL", color: "bg-success/15 text-success" },
};

export default function BadgeProjectSize({ size, active = false }: { size: string; active?: boolean }) {
  const cfg = SIZE_CONFIG[size] ?? SIZE_CONFIG.M;
  return (
    <span className={cn(
      "inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide transition-all",
      cfg.color,
      active && "ring-1 ring-primary/40 shadow-sm"
    )}>
      {cfg.label}
    </span>
  );
}
