import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CreditCard, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  planName: string;
  /** Plan price in CENTS as stored in plan_catalog.monthly_price */
  planPrice: number;
  /** Optional add-on price in CENTS as stored in lead_packs.pack_price */
  leadPackPrice?: number;
  variant: "regular" | "founders";
  sessionId: string | null;
  planId: string;
  /** Canonical plan code used for routing to the native checkout (e.g. "premium"). */
  planCode: string;
  leadPackId: string | null;
}

const fmt = (dollars: number) =>
  dollars.toLocaleString("fr-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function PanelInlineCheckout({
  planName, planPrice, leadPackPrice, variant, sessionId, planId, planCode, leadPackId,
}: Props) {
  const [loading, setLoading] = useState(false);

  // Convert cents → dollars at the boundary. UI math runs in dollars.
  const planPriceD = (planPrice ?? 0) / 100;
  const packPriceD = (leadPackPrice ?? 0) / 100;
  const subtotal = planPriceD + packPriceD;
  const tps = Math.round(subtotal * 0.05 * 100) / 100;
  const tvq = Math.round(subtotal * 0.09975 * 100) / 100;
  const total = Math.round((subtotal + tps + tvq) * 100) / 100;

  const handleCheckout = async () => {
    setLoading(true);
    try {
      // Create checkout record (amounts in cents for DB consistency)
      await supabase.from("contractor_checkouts").insert({
        contractor_plan_session_id: sessionId,
        pricing_plan_id: planId,
        selected_variant: variant,
        lead_pack_id: leadPackId,
        payment_status: "pending",
        amount_subtotal: Math.round(subtotal * 100),
        amount_tax: Math.round((tps + tvq) * 100),
        amount_total: Math.round(total * 100),
      });

      if (sessionId) {
        await supabase.from("contractor_plan_events").insert({
          contractor_plan_session_id: sessionId,
          event_type: "checkout_started",
          event_payload_json: { planId, planCode, variant, leadPackId, total },
        });
      }

      // Navigate to native Stripe checkout using the canonical plan CODE
      window.location.href = `/checkout/native/${planCode}`;
    } catch (e) {
      console.error("[PanelInlineCheckout] checkout error", e);
      toast.error("Le paiement n'a pas pu être lancé. Réessayez ou contactez UNPRO.");
      setLoading(false);
    }
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-primary" /> Récapitulatif
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span>Plan {planName} {variant === "founders" ? "(Fondateurs)" : ""}</span>
            <span className="font-medium">{fmt(planPriceD)} $</span>
          </div>
          {packPriceD > 0 && (
            <div className="flex justify-between">
              <span>Pack leads supplémentaires</span>
              <span className="font-medium">{fmt(packPriceD)} $</span>
            </div>
          )}
          <div className="border-t pt-1.5 flex justify-between text-xs text-muted-foreground">
            <span>TPS (5%)</span><span>{fmt(tps)} $</span>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>TVQ (9,975%)</span><span>{fmt(tvq)} $</span>
          </div>
          <div className="border-t pt-1.5 flex justify-between font-bold text-base">
            <span>Total</span><span>{fmt(total)} $</span>
          </div>
        </div>

        <Button onClick={handleCheckout} disabled={loading} className="w-full h-12 text-base font-semibold">
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CreditCard className="w-4 h-4 mr-2" />}
          Payer {fmt(total)} $ maintenant
        </Button>

        <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <Shield className="w-3 h-3" />
          Paiement sécurisé • Annulation en tout temps
        </div>
      </CardContent>
    </Card>
  );
}
