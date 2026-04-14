/**
 * UNPRO — Affiliate Revenue Widget
 */
import { DollarSign } from "lucide-react";

interface Props {
  totalCents: number;
  pendingCents: number;
  paidCents: number;
}

const WidgetAffiliateRevenue = ({ totalCents, pendingCents, paidCents }: Props) => {
  return (
    <div className="rounded-xl border border-border/30 bg-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <DollarSign className="h-4 w-4 text-amber-500" />
        <h3 className="text-sm font-semibold text-foreground">Revenus Commissions</h3>
      </div>
      <div className="text-3xl font-bold text-foreground">{(totalCents / 100).toFixed(2)} $</div>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-muted/20 p-3 text-center">
          <div className="text-lg font-semibold text-amber-600">{(pendingCents / 100).toFixed(2)} $</div>
          <div className="text-xs text-muted-foreground">En attente</div>
        </div>
        <div className="rounded-lg bg-muted/20 p-3 text-center">
          <div className="text-lg font-semibold text-emerald-600">{(paidCents / 100).toFixed(2)} $</div>
          <div className="text-xs text-muted-foreground">Payé</div>
        </div>
      </div>
    </div>
  );
};

export default WidgetAffiliateRevenue;
