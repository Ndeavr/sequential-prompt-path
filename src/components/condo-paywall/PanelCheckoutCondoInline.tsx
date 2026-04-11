import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { CONDO_PRICING_TIERS, getTierForUnits, type CondoPricingTier } from "@/config/condoPricing";
import { useCondoSubscription } from "@/hooks/useCondoSubscription";
import { useState } from "react";

interface Props {
  unitCount?: number;
}

export default function PanelCheckoutCondoInline({ unitCount = 6 }: Props) {
  const { startCheckout } = useCondoSubscription();
  const [loading, setLoading] = useState(false);
  const tier = getTierForUnits(unitCount);

  const handlePay = async () => {
    setLoading(true);
    try {
      await startCheckout(tier.priceId);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card rounded-2xl border border-primary/20 p-6 space-y-4 text-center">
      <h3 className="text-lg font-display font-bold text-foreground">
        UNPRO Condo Premium
      </h3>
      <p className="text-3xl font-bold text-primary">{tier.priceTaxIncluded}$<span className="text-sm font-normal text-muted-foreground">/mois</span></p>
      <p className="text-xs text-muted-foreground">{tier.units} · {tier.perUnit} · TPS/TVQ incluses</p>
      <Button size="lg" className="w-full gap-2" onClick={handlePay} disabled={loading}>
        {loading ? "Redirection…" : <>Payer maintenant <ArrowRight className="h-4 w-4" /></>}
      </Button>
    </div>
  );
}
