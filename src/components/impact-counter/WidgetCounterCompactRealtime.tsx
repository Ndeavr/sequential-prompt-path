/**
 * WidgetCounterCompactRealtime — Compact counter card with full formatted numbers.
 * RULE: Never abbreviate (no 35k). Always show 35,345 format.
 */
import { motion } from "framer-motion";
import { useImpactCounter } from "@/hooks/useImpactCounter";
import { cn } from "@/lib/utils";

function formatFull(n: number): string {
  return Math.floor(n).toLocaleString("fr-CA");
}

function formatCurrency(n: number): string {
  return Math.floor(n).toLocaleString("fr-CA") + " $";
}

export interface CounterMetric {
  type: "submissions" | "hours" | "dollars" | "custom";
  label: string;
  customValue?: number;
}

interface Props {
  primary: CounterMetric;
  secondary?: CounterMetric;
  className?: string;
}

function resolveValue(metric: CounterMetric, snap: ReturnType<typeof useImpactCounter>): string {
  switch (metric.type) {
    case "submissions": return formatFull(snap.savedSubmissions);
    case "hours": return formatFull(snap.hoursSaved);
    case "dollars": return formatCurrency(snap.adSavingsCad);
    case "custom": return formatFull(metric.customValue ?? 0);
  }
}

export default function WidgetCounterCompactRealtime({ primary, secondary, className }: Props) {
  const snap = useImpactCounter("realiste");

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.4 }}
      className={cn(
        "inline-flex items-center gap-3 rounded-2xl border border-border/30 bg-card/60 backdrop-blur-sm px-4 py-2.5 shadow-sm",
        className
      )}
    >
      {/* LIVE dot */}
      <div className="flex items-center gap-1.5">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary/60" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
        </span>
        <span className="text-[9px] font-bold uppercase tracking-wider text-primary">LIVE</span>
      </div>

      {/* Primary metric */}
      <div className="text-center min-w-0">
        <p className="text-base sm:text-lg font-bold text-foreground tabular-nums leading-tight">
          {resolveValue(primary, snap)}
        </p>
        <p className="text-[10px] text-muted-foreground leading-tight truncate">{primary.label}</p>
      </div>

      {/* Separator + secondary */}
      {secondary && (
        <>
          <div className="w-px h-6 bg-border/30" />
          <div className="text-center min-w-0">
            <p className="text-sm font-semibold text-muted-foreground tabular-nums leading-tight">
              {resolveValue(secondary, snap)}
            </p>
            <p className="text-[10px] text-muted-foreground/70 leading-tight truncate">{secondary.label}</p>
          </div>
        </>
      )}
    </motion.div>
  );
}
