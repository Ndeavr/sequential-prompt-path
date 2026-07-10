/**
 * UNPRO — Funnel Stage Card
 * One stage of the outreach command center funnel.
 */
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { FunnelStageRow } from "@/hooks/useOutreachCommandCenter";

interface Props {
  stage: FunnelStageRow;
  previousTotal?: number;
  isFirst?: boolean;
}

function DeltaBadge({ value }: { value: number }) {
  const Icon = value > 0 ? TrendingUp : value < 0 ? TrendingDown : Minus;
  const color =
    value > 0 ? "text-emerald-400" : value < 0 ? "text-red-400" : "text-readable-muted";
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] ${color}`}>
      <Icon className="w-3 h-3" />
      {value > 0 ? "+" : ""}{value}
    </span>
  );
}

export default function FunnelStageCard({ stage, previousTotal, isFirst }: Props) {
  const conversion =
    !isFirst && previousTotal && previousTotal > 0
      ? Math.round((stage.total / previousTotal) * 1000) / 10
      : null;

  return (
    <div className="rounded-xl border border-border/20 bg-card/30 backdrop-blur-sm p-4 min-w-[160px]">
      <div className="text-[10px] uppercase tracking-wider text-readable-muted mb-1">
        {stage.stage_label}
      </div>
      <div className="text-2xl font-bold text-readable tabular-nums">
        {stage.total.toLocaleString("fr-CA")}
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        {conversion !== null ? (
          <span className="text-[11px] text-readable-muted">
            {conversion}% conv.
          </span>
        ) : (
          <span className="text-[11px] text-readable-muted">—</span>
        )}
        <div className="flex flex-col items-end gap-0.5">
          <DeltaBadge value={stage.delta_24h} />
          <span className="text-[9px] text-readable-muted/70">24h</span>
        </div>
      </div>
      <div className="mt-1 text-right">
        <DeltaBadge value={stage.delta_7d} />
        <div className="text-[9px] text-readable-muted/70">7j</div>
      </div>
    </div>
  );
}
