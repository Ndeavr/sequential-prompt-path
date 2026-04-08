import { useCallback } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from "@stripe/react-stripe-js";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BillingInterval } from "@/hooks/usePlanCatalog";

const STRIPE_PUBLISHABLE_KEY = "pk_live_Gw47doir5ZX9n9uM0nrBpKro";
const stripePromise = STRIPE_PUBLISHABLE_KEY.startsWith("pk_")
  ? loadStripe(STRIPE_PUBLISHABLE_KEY)
  : null;

interface InlineStripeCheckoutProps {
  planCode: string;
  planName: string;
  interval: BillingInterval;
  onCancel: () => void;
}

export default function InlineStripeCheckout({
  planCode,
  planName,
  interval,
  onCancel,
}: InlineStripeCheckoutProps) {
  const fetchClientSecret = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke(
      "create-checkout-session",
      {
        body: {
          planId: planCode,
          billingInterval: interval,
          uiMode: "embedded",
          returnUrl: `${window.location.origin}/pro/onboarding?plan=${planCode}&checkout=success&session_id={CHECKOUT_SESSION_ID}`,
        },
      }
    );

    if (error || !data?.clientSecret) {
      throw new Error(error?.message || "Impossible de créer la session de paiement");
    }

    return data.clientSecret;
  }, [planCode, interval]);

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
    <div className="w-full">
      <div className="flex items-center gap-3 mb-4">
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

      <div className="rounded-2xl border border-border bg-card overflow-hidden min-h-[400px]">
        <EmbeddedCheckoutProvider
          key={`${planCode}-${interval}`}
          stripe={stripePromise}
          options={{ fetchClientSecret }}
        >
          <EmbeddedCheckout />
        </EmbeddedCheckoutProvider>
      </div>
    </div>
  );
}
