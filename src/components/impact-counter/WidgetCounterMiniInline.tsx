/**
 * WidgetCounterMiniInline — Compact single-line counter for embedding anywhere.
 * Format: "142k soumissions évitées • 52k heures • 7.8M$ économisés"
 */
import { useImpactCounter } from "@/hooks/useImpactCounter";
import { cn } from "@/lib/utils";

function compactNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(".0", "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(n >= 10_000 ? 0 : 1).replace(".0", "") + "k";
  return Math.floor(n).toString();
}

interface Props {
  className?: string;
  contextLabel?: string;
}

export default function WidgetCounterMiniInline({ className, contextLabel }: Props) {
  const snap = useImpactCounter("realiste");

  return (
    <div className={cn("flex items-center gap-1.5 flex-wrap justify-center text-xs sm:text-sm font-medium text-muted-foreground", className)}>
      <span className="text-primary font-bold tabular-nums">{compactNumber(snap.savedSubmissions)}</span>
      <span>soumissions évitées</span>
      <span className="text-border">•</span>
      <span className="text-accent font-bold tabular-nums">{compactNumber(snap.hoursSaved)}</span>
      <span>heures</span>
      <span className="text-border">•</span>
      <span className="text-success font-bold tabular-nums">{compactNumber(snap.adSavingsCad)}$</span>
      <span>économisés</span>
      {contextLabel && (
        <>
          <span className="text-border">•</span>
          <span className="text-muted-foreground/70 text-[10px]">{contextLabel}</span>
        </>
      )}
    </div>
  );
}
