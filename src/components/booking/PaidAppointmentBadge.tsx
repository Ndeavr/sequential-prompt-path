/**
 * Badge component showing paid/free/deposit status on appointment cards
 */
import { DollarSign, Gift, Shield } from "lucide-react";
import { formatCentsShort } from "@/services/bookingRevenueEngine";

interface Props {
  priceType: string;
  priceCents: number;
  refundable?: boolean;
  applyToInvoice?: boolean;
}

export function PaidAppointmentBadge({ priceType, priceCents, refundable, applyToInvoice }: Props) {
  if (priceType === "free" || priceCents === 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 text-[11px] font-semibold">
        <Gift className="w-3 h-3" />
        Gratuit
      </span>
    );
  }

  return (
    <div className="flex flex-col items-end gap-0.5">
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/15 text-primary text-[11px] font-semibold">
        <DollarSign className="w-3 h-3" />
        {priceType === "starting_from" && "À partir de "}
        {formatCentsShort(priceCents)}
      </span>
      {refundable && (
        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
          <Shield className="w-2.5 h-2.5" />
          Remboursable
        </span>
      )}
      {applyToInvoice && (
        <span className="text-[10px] text-muted-foreground">
          Applicable à la facture
        </span>
      )}
    </div>
  );
}
