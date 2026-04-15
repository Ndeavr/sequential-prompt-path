/**
 * PanelAlexStripePaymentInline — Stripe Payment Element rendered inline in Alex chat.
 * Uses create-subscription-intent to get client_secret, then renders PaymentElement.
 */
import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CreditCard, Check, Shield, Loader2 } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const STRIPE_PK = "pk_live_Gw47doir5ZX9n9uM0nrBpKro";
const stripePromise = STRIPE_PK.startsWith("pk_") ? loadStripe(STRIPE_PK, { locale: "fr-CA" }) : null;

interface Props {
  planCode: string;
  planName: string;
  price: number;
  interval: "monthly" | "yearly";
  onSuccess: () => void;
  onError?: (msg: string) => void;
}

function PaymentForm({ onSuccess, onError }: { onSuccess: () => void; onError?: (msg: string) => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [ready, setReady] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!stripe || !elements) return;
    setConfirming(true);
    setError(null);

    const { error: submitError } = await elements.submit();
    if (submitError) {
      setError(submitError.message || "Erreur de validation");
      setConfirming(false);
      return;
    }

    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/checkout/success?plan=pro`,
      },
      redirect: "if_required",
    });

    if (confirmError) {
      setError(confirmError.message || "Paiement refusé");
      setConfirming(false);
      onError?.(confirmError.message || "Paiement refusé");
    } else {
      setConfirming(false);
      onSuccess();
    }
  };

  return (
    <div className="space-y-3">
      <PaymentElement
        onReady={() => setReady(true)}
        options={{
          layout: "accordion",
          defaultValues: { billingDetails: { address: { country: "CA" } } },
        }}
      />
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
      <Button
        onClick={handleSubmit}
        disabled={!stripe || !elements || confirming || !ready}
        className="w-full h-11 text-sm font-bold gap-2"
      >
        {confirming ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Traitement…</>
        ) : (
          <><CreditCard className="h-4 w-4" /> Confirmer le paiement</>
        )}
      </Button>
      <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
        <Shield className="h-3 w-3" />
        <span>Paiement sécurisé par Stripe</span>
      </div>
    </div>
  );
}

export default function PanelAlexStripePaymentInline({ planCode, planName, price, interval, onSuccess, onError }: Props) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const billingInterval = interval === "yearly" ? "year" : "month";
        const { data, error: fnError } = await supabase.functions.invoke("create-subscription-intent", {
          body: { planCode, billingInterval },
        });

        if (cancelled) return;

        if (fnError || !data?.clientSecret) {
          setError(data?.error || fnError?.message || "Impossible de créer la session de paiement");
          setLoading(false);
          return;
        }

        setClientSecret(data.clientSecret);
        setLoading(false);
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || "Erreur inattendue");
          setLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [planCode, interval]);

  const handleSuccess = useCallback(() => {
    setSuccess(true);
    onSuccess();
  }, [onSuccess]);

  if (success) {
    return (
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="rounded-2xl border border-green-500/30 bg-green-500/5 p-5 text-center space-y-3"
      >
        <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
          <Check className="h-6 w-6 text-green-500" />
        </div>
        <h4 className="text-sm font-bold text-foreground">Paiement confirmé!</h4>
        <p className="text-xs text-muted-foreground">
          Votre plan {planName} est en cours d'activation. Alex va vous guider pour les prochaines étapes.
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ y: 10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-4 space-y-3"
    >
      <div className="flex items-center gap-2">
        <CreditCard className="h-4 w-4 text-primary" />
        <h4 className="text-sm font-semibold text-foreground">Paiement — Plan {planName}</h4>
      </div>

      <div className="rounded-xl bg-background/50 border border-border/30 p-3">
        <div className="flex items-baseline justify-between">
          <span className="text-lg font-bold text-foreground">
            {new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD" }).format(price)}
          </span>
          <span className="text-xs text-muted-foreground">/{interval === "yearly" ? "an" : "mois"}</span>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-xs">Préparation du paiement…</span>
        </div>
      ) : error ? (
        <div className="text-center py-4">
          <p className="text-xs text-destructive">{error}</p>
          <p className="text-[10px] text-muted-foreground mt-1">Connectez-vous pour activer votre plan.</p>
        </div>
      ) : clientSecret && stripePromise ? (
        <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: "night" } }}>
          <PaymentForm onSuccess={handleSuccess} onError={onError} />
        </Elements>
      ) : null}
    </motion.div>
  );
}
