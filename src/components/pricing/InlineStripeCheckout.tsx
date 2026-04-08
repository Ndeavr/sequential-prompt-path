import { useCallback, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from "@stripe/react-stripe-js";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BillingInterval } from "@/hooks/usePlanCatalog";
import FormCouponCodeInline from "@/components/coupon/FormCouponCodeInline";
import type { CouponValidationResult } from "@/hooks/useCoupons";

const STRIPE_PUBLISHABLE_KEY = "pk_live_Gw47doir5ZX9n9uM0nrBpKro";
const stripePromise = STRIPE_PUBLISHABLE_KEY.startsWith("pk_")
  ? loadStripe(STRIPE_PUBLISHABLE_KEY)
  : null;

interface InlineStripeCheckoutProps {
  planCode: string;
  planName: string;
  interval: BillingInterval;
  basePrice?: number;
  onCancel: () => void;
}

export default function InlineStripeCheckout({
  planCode,
  planName,
  interval,
  basePrice = 0,
  onCancel,
}: InlineStripeCheckoutProps) {
  const [couponResult, setCouponResult] = useState<CouponValidationResult | null>(null);
  const [checkoutKey, setCheckoutKey] = useState(0);

  const handleCouponChange = (result: CouponValidationResult | null) => {
    setCouponResult(result);
    // Force re-create checkout session with new promo
    setCheckoutKey((k) => k + 1);
  };

  const fetchClientSecret = useCallback(async () => {
    const body: any = {
      planId: planCode,
      billingInterval: interval,
      uiMode: "embedded",
      returnUrl: `${window.location.origin}/pro/onboarding?plan=${planCode}&checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    };

    // Pass validated promo code to backend
    if (couponResult?.valid && couponResult.code) {
      body.promoCode = couponResult.code;
    }

    const { data, error } = await supabase.functions.invoke(
      "create-checkout-session",
      { body }
    );

    if (error || !data?.clientSecret) {
      throw new Error(error?.message || "Impossible de créer la session de paiement");
    }

    return data.clientSecret;
  }, [planCode, interval, couponResult]);

  if (!stripePromise) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive text-sm mb-4">
          Clé publique Stripe invalide.
        </p>
        <Button variant="ghost" onClick={onCancel}>Retour aux plans</Button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="gap-2 text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux plans
        </Button>
        <span className="text-sm text-muted-foreground">
          Paiement pour <strong className="text-foreground">{planName}</strong>
        </span>
      </div>

      {/* Coupon input */}
      <div className="rounded-xl border border-border/50 bg-card p-4">
        <FormCouponCodeInline
          planCode={planCode}
          billingInterval={interval}
          basePrice={basePrice}
          onCouponChange={handleCouponChange}
        />
      </div>

      {/* Zero-total activation message */}
      {couponResult?.valid && couponResult.discount_type === "percentage" && couponResult.discount_value === 100 && (
        <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4 text-center">
          <p className="text-green-600 font-semibold text-sm">
            🎉 Votre plan sera activé gratuitement !
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Cliquez ci-dessous pour confirmer l'activation.
          </p>
        </div>
      )}

      {/* Stripe Embedded Checkout */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden min-h-[400px]">
        <EmbeddedCheckoutProvider
          key={`${planCode}-${interval}-${checkoutKey}`}
          stripe={stripePromise}
          options={{ fetchClientSecret }}
        >
          <EmbeddedCheckout />
        </EmbeddedCheckoutProvider>
      </div>
    </div>
  );
}
