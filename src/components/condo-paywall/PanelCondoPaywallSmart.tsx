import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import BadgeUrgencyLimited from "./BadgeUrgencyLimited";
import CardProgressLockedBlurred from "./CardProgressLockedBlurred";
import PanelPlanComparisonCondo from "./PanelPlanComparisonCondo";
import PanelAlexClosingConversion from "./PanelAlexClosingConversion";
import { CONDO_PRICING_TIERS, getTierForUnits } from "@/config/condoPricing";
import { useCondoSubscription } from "@/hooks/useCondoSubscription";

interface Props {
  score: number;
  riskCount: number;
  remainingActions: number;
  unitCount?: number;
  onUnlock: () => void;
}

export default function PanelCondoPaywallSmart({
  score,
  riskCount,
  remainingActions,
  unitCount = 6,
  onUnlock,
}: Props) {
  const { startCheckout } = useCondoSubscription();
  const tier = getTierForUnits(unitCount);

  const handleCheckout = async () => {
    try {
      await startCheckout(tier.priceId);
    } catch {
      // fallback
      onUnlock();
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <BadgeUrgencyLimited />
      </div>

      <PanelAlexClosingConversion score={score} riskCount={riskCount} />

      <CardProgressLockedBlurred score={score} remainingActions={remainingActions} />

      <PanelPlanComparisonCondo />

      <div className="text-center space-y-2">
        <p className="text-xs text-muted-foreground">
          À partir de {tier.priceTaxIncluded}$/mois · {tier.units} · Taxes incluses
        </p>
        <Button size="lg" className="w-full gap-2" onClick={handleCheckout}>
          Débloquer maintenant <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
