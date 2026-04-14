import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CreditCard, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  planName: string;
  planPrice: number;
  leadPackPrice?: number;
  variant: "regular" | "founders";
  sessionId: string | null;
  planId: string;
  leadPackId: string | null;
}

export default function PanelInlineCheckout({
  planName, planPrice, leadPackPrice, variant, sessionId, planId, leadPackId,
}: Props) {
  const [loading, setLoading] = useState(false);

  const subtotal = planPrice + (leadPackPrice ?? 0);
  const tps = Math.round(subtotal * 0.05 * 100) / 100;
  const tvq = Math.round(subtotal * 0.09975 * 100) / 100;
  const total = Math.round((subtotal + tps + tvq) * 100) / 100;

  const handleCheckout = async () => {
    setLoading(true);
    try {
      // Create checkout record
      await supabase.from("contractor_checkouts").insert({
        contractor_plan_session_id: sessionId,
        pricing_plan_id: planId,
        selected_variant: variant,
        lead_pack_id: leadPackId,
        payment_status: "pending",
        amount_subtotal: subtotal,
        amount_tax: tps + tvq,
        amount_total: total,
      });

      // Log event
      if (sessionId) {
        await supabase.from("contractor_plan_events").insert({
          contractor_plan_session_id: sessionId,
          event_type: "checkout_started",
          event_payload_json: { planId, variant, leadPackId, total },
        });
      }

      // Navigate to Stripe checkout
      window.location.href = `/checkout/native/${planName.toLowerCase()}`;
    } catch (e) {
      toast.error("Erreur lors du checkout. Réessayez.");
    } finally {
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
            <span className="font-medium">{planPrice}$</span>
          </div>
          {leadPackPrice != null && leadPackPrice > 0 && (
            <div className="flex justify-between">
              <span>Pack leads supplémentaires</span>
              <span className="font-medium">{leadPackPrice}$</span>
            </div>
          )}
          <div className="border-t pt-1.5 flex justify-between text-xs text-muted-foreground">
            <span>TPS (5%)</span><span>{tps.toFixed(2)}$</span>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>TVQ (9.975%)</span><span>{tvq.toFixed(2)}$</span>
          </div>
          <div className="border-t pt-1.5 flex justify-between font-bold text-base">
            <span>Total</span><span>{total.toFixed(2)}$</span>
          </div>
        </div>

        <Button onClick={handleCheckout} disabled={loading} className="w-full h-12 text-base font-semibold">
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CreditCard className="w-4 h-4 mr-2" />}
          Payer {total.toFixed(2)}$ maintenant
        </Button>

        <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <Shield className="w-3 h-3" />
          Paiement sécurisé • Annulation en tout temps
        </div>
      </CardContent>
    </Card>
  );
}
