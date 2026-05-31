import { cn } from "@/lib/utils";

const POSITIONS: Record<string, { label: string; tone: string }> = {
  invisible: { label: "INVISIBLE", tone: "bg-muted text-muted-foreground" },
  weak: { label: "FAIBLE", tone: "bg-destructive/20 text-destructive border-destructive/40" },
  emerging: { label: "ÉMERGENT", tone: "bg-secondary/20 text-secondary border-secondary/40" },
  trusted: { label: "DE CONFIANCE", tone: "bg-primary/20 text-primary border-primary/40" },
  dominant: { label: "DOMINANT", tone: "bg-primary/30 text-primary border-primary/60 intel-glow" },
  category_authority: { label: "AUTORITÉ DE CATÉGORIE", tone: "bg-secondary/30 text-secondary border-secondary/60 intel-glow" },
};

export default function TrustPositionBadge({ position, className }: { position?: string | null; className?: string }) {
  const p = POSITIONS[position || "invisible"] || POSITIONS.invisible;
  return (
    <span className={cn(
      "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] tracking-[0.15em] font-bold uppercase border border-transparent",
      p.tone, className,
    )}>
      <span className="size-1.5 rounded-full bg-current" />
      {p.label}
    </span>
  );
}
