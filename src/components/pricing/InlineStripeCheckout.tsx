import { useCallback, useState, useEffect } from "react";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from "@stripe/react-stripe-js";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BillingInterval } from "@/hooks/usePlanCatalog";

// Will be loaded from edge function
let stripePromise: Promise<Stripe | null> | null = null;

async function getStripePromise(): Promise<Promise<Stripe | null>> {
  if (stripePromise) return stripePromise;
  const { data } = await supabase.functions.invoke("get-stripe-publishable-key");
  const key = data?.publishableKey;
  if (!key) throw new Error("Stripe publishable key not available");
  stripePromise = loadStripe(key);
  return stripePromise;
}

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
  const [stripe, setStripe] = useState<Promise<Stripe | null> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getStripePromise()
      .then(setStripe)
      .catch((e) => setError(e.message));
  }, []);

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

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive text-sm mb-4">{error}</p>
        <Button variant="ghost" onClick={onCancel}>Retour aux plans</Button>
      </div>
    );
  }

  if (!stripe) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="ml-2 text-sm text-muted-foreground">Chargement du paiement…</span>
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
          stripe={stripe}
          options={{ fetchClientSecret }}
        >
          <EmbeddedCheckout />
        </EmbeddedCheckoutProvider>
      </div>
    </div>
  );
}
