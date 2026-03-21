/**
 * Revenue split preview — shows contractor how much they earn per paid booking
 */
import { DollarSign, ArrowRight } from "lucide-react";
import { calculateRevenueSplit, formatCentsShort, UNPRO_FEE_RATE } from "@/services/bookingRevenueEngine";

interface Props {
  priceCents: number;
  priceType: string;
}

export function RevenueSplitPreview({ priceCents, priceType }: Props) {
  if (priceType === "free" || priceCents <= 0) return null;

  const split = calculateRevenueSplit(priceCents);

  return (
    <div className="rounded-lg border border-border/40 bg-muted/10 p-3 space-y-2">
      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
        Répartition des revenus
      </p>
      <div className="flex items-center gap-2 text-meta">
        <div className="flex items-center gap-1 text-foreground font-semibold">
          <DollarSign className="w-3.5 h-3.5" />
          {formatCentsShort(split.totalCents)}
        </div>
        <ArrowRight className="w-3 h-3 text-muted-foreground" />
        <div className="flex gap-3">
          <span className="text-primary font-medium">
            Vous: {formatCentsShort(split.contractorAmountCents)}
          </span>
          <span className="text-muted-foreground">
            Plateforme: {formatCentsShort(split.unproFeeCents)} ({Math.round(UNPRO_FEE_RATE * 100)}%)
          </span>
        </div>
      </div>
    </div>
  );
}
