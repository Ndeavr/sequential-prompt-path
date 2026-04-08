/**
 * UNPRO — Native Checkout Page (Payment Element)
 * 95% UNPRO / 5% Stripe — Stripe only handles secure card fields.
 * Route: /checkout/native/:planCode
 */
import { useCallback, useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Shield, Lock, CreditCard, Check,
  Sparkles, Clock, Calendar, Users, TrendingUp, Crown,
  CheckCircle2, Loader2, Tag, Star, X, RefreshCw,
  ChevronDown, Zap, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useCheckoutPricing, fmtCAD, fmtCADExact, type CheckoutPricing } from "@/hooks/useCheckoutPricing";
import { useValidateCoupon } from "@/hooks/useCoupons";
import { cn } from "@/lib/utils";
import type { BillingInterval } from "@/hooks/usePlanCatalog";

const STRIPE_PK = "pk_live_Gw47doir5ZX9n9uM0nrBpKro";
const stripePromise = STRIPE_PK.startsWith("pk_")
  ? loadStripe(STRIPE_PK, { locale: "fr-CA" })
  : null;

const PLAN_ICONS: Record<string, React.ElementType> = {
  recrue: Users,
  pro: TrendingUp,
  premium: Star,
  elite: Crown,
  signature: Shield,
};

// ─── Panel: Plan Summary ───────────────────────────────────────

function PanelCheckoutPlanSummary({
  pricing,
  interval,
  onIntervalChange,
}: {
  pricing: CheckoutPricing;
  interval: BillingInterval;
  onIntervalChange: (iv: BillingInterval) => void;
}) {
  const Icon = PLAN_ICONS[pricing.plan_code] || Users;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border/50 bg-card overflow-hidden"
    >
      <div className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">Votre plan</p>
              <h2 className="text-lg font-black text-foreground">{pricing.plan_name}</h2>
            </div>
          </div>
        </div>

        <div className="text-center py-2">
          <p className="text-3xl font-black text-foreground">
            {fmtCAD(pricing.base_price)}
            <span className="text-base font-medium text-muted-foreground ml-1">
              / {interval === "year" ? "an" : "mois"}
            </span>
          </p>
          {interval === "year" && pricing.equivalent_monthly > 0 && (
            <p className="text-sm text-muted-foreground mt-1">
              Équivaut à {fmtCAD(pricing.equivalent_monthly)} / mois
            </p>
          )}
        </div>

        {/* Billing toggle */}
        <div className="flex rounded-xl bg-muted/50 p-1">
          {(["month", "year"] as BillingInterval[]).map((iv) => (
            <button
              key={iv}
              className={cn(
                "flex-1 py-2.5 px-3 rounded-lg text-sm font-medium transition-all",
                interval === iv
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => onIntervalChange(iv)}
            >
              {iv === "month" ? "Mensuel" : (
                <span className="flex items-center justify-center gap-1.5">
                  Annuel
                  {pricing.yearly_savings_percent > 0 && (
                    <span className="text-[10px] bg-green-500/20 text-green-600 px-1.5 py-0.5 rounded-full font-bold">
                      -{pricing.yearly_savings_percent}%
                    </span>
                  )}
                </span>
              )}
            </button>
          ))}
        </div>

        {pricing.features.length > 0 && (
          <div className="space-y-1.5">
            {pricing.features.slice(0, 4).map((f, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                <span className="text-muted-foreground text-xs">{f}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Panel: Coupon ─────────────────────────────────────────────

function PanelCheckoutCouponInline({
  planCode,
  billingInterval,
  appliedCoupon,
  onApply,
  onRemove,
}: {
  planCode: string;
  billingInterval: string;
  appliedCoupon: string | null;
  onApply: (code: string) => void;
  onRemove: () => void;
}) {
  const [code, setCode] = useState(appliedCoupon || "");
  const [showInput, setShowInput] = useState(!!appliedCoupon);
  const [error, setError] = useState<string | null>(null);
  const validate = useValidateCoupon();

  const handleApply = async () => {
    if (!code.trim()) return;
    setError(null);
    validate.mutate(
      { code: code.trim(), planCode, billingInterval },
      {
        onSuccess: (res) => {
          if (res.valid) {
            onApply(code.trim().toUpperCase());
            setError(null);
          } else {
            setError(res.message || "Code invalide");
          }
        },
        onError: () => setError("Erreur de validation"),
      }
    );
  };

  const handleRemove = () => {
    setCode("");
    setError(null);
    onRemove();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
      className="rounded-2xl border border-border/50 bg-card p-4 space-y-3"
    >
      {!showInput && !appliedCoupon ? (
        <button
          type="button"
          onClick={() => setShowInput(true)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
        >
          <Tag className="h-3.5 w-3.5" />
          <span>Vous avez un code promo ?</span>
          <ChevronDown className="h-3.5 w-3.5 ml-auto" />
        </button>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={code}
                onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(null); }}
                placeholder="Code promo"
                className="pl-9 h-11 font-mono text-sm uppercase tracking-wider"
                disabled={validate.isPending || !!appliedCoupon}
                onKeyDown={(e) => e.key === "Enter" && !appliedCoupon && handleApply()}
              />
            </div>
            {!appliedCoupon ? (
              <Button variant="outline" size="sm" className="h-11 px-4 shrink-0"
                onClick={handleApply} disabled={validate.isPending || !code.trim()}>
                {validate.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Appliquer"}
              </Button>
            ) : (
              <Button variant="ghost" size="sm" className="h-11 px-3 shrink-0" onClick={handleRemove}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
          {appliedCoupon && (
            <Badge className="bg-green-500/10 text-green-600 border-green-500/20 gap-1.5 py-1 px-3">
              <Check className="w-3.5 h-3.5" /> Code appliqué
            </Badge>
          )}
          {error && (
            <div className="rounded-lg px-3 py-2 text-xs font-medium flex items-center gap-2 bg-destructive/10 text-destructive border border-destructive/20">
              <X className="w-3.5 h-3.5 shrink-0" /> {error}
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}

// ─── Panel: Tax Breakdown ──────────────────────────────────────

function PanelCheckoutTaxBreakdown({ pricing }: { pricing: CheckoutPricing }) {
  const hasCoupon = pricing.coupon && pricing.discount_amount > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="rounded-2xl border border-border/50 bg-card p-5 space-y-3"
    >
      <p className="text-sm font-bold text-foreground">Facturation</p>
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">
            Prix du plan ({pricing.billing_interval === "year" ? "annuel" : "mensuel"})
          </span>
          <span className={cn("text-foreground", hasCoupon && "line-through text-muted-foreground")}>
            {fmtCADExact(pricing.subtotal_before_discount)}
          </span>
        </div>

        {hasCoupon && pricing.coupon && (
          <>
            <div className="flex justify-between text-sm">
              <span className="text-green-600 font-medium">
                Rabais {pricing.coupon.discount_type === "percentage" ? `(${pricing.coupon.discount_value}%)` : ""}
              </span>
              <span className="text-green-600 font-medium">-{fmtCADExact(pricing.discount_amount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Sous-total après rabais</span>
              <span className="text-foreground">{fmtCADExact(pricing.subtotal_after_discount)}</span>
            </div>
          </>
        )}

        <div className="border-t border-border/40 my-1" />

        {pricing.taxes.map((t, i) => (
          <div key={i} className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t.tax_name} ({(t.tax_rate * 100).toFixed(3)}%)</span>
            <span className="text-foreground">{fmtCADExact(t.amount)}</span>
          </div>
        ))}

        <div className="border-t border-border/60 my-1" />

        <div className="flex justify-between items-center">
          <span className="font-bold text-foreground">Montant facturé aujourd'hui</span>
          <span className="text-xl font-black text-foreground">{fmtCADExact(pricing.total_due_today)}</span>
        </div>
      </div>

      {/* Renewal */}
      <div className="rounded-xl bg-muted/30 p-3 mt-2 space-y-1">
        <p className="text-xs font-medium text-foreground">
          Renouvellement {pricing.renewal.interval_label}
        </p>
        <p className="text-xs text-muted-foreground">
          Prochain : {new Date(pricing.renewal.next_date).toLocaleDateString("fr-CA", {
            year: "numeric", month: "long", day: "numeric",
          })}
        </p>
        <p className="text-xs text-muted-foreground">
          {pricing.coupon?.duration_type === "once"
            ? `Puis ${fmtCADExact(pricing.renewal.total)} / ${pricing.billing_interval === "year" ? "an" : "mois"} (taxes incluses)`
            : `${fmtCADExact(pricing.renewal.total)} / ${pricing.billing_interval === "year" ? "an" : "mois"} (taxes incluses)`
          }
        </p>
      </div>
    </motion.div>
  );
}

// ─── Panel: Trust Signals ──────────────────────────────────────

function PanelCheckoutTrustSignals() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="rounded-2xl border border-border/50 bg-card p-4 space-y-3"
    >
      <p className="text-sm font-bold text-foreground">Après le paiement</p>
      <div className="space-y-2">
        {[
          { icon: Sparkles, text: "Plan activé immédiatement après confirmation" },
          { icon: Calendar, text: "Connexion agenda disponible" },
          { icon: Clock, text: "Rendez-vous qualifiés dès que vous êtes prêt" },
        ].map(({ icon: Ic, text }, i) => (
          <div key={i} className="flex items-center gap-2.5 text-sm">
            <div className="w-7 h-7 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
              <Ic className="w-3.5 h-3.5 text-green-500" />
            </div>
            <span className="text-muted-foreground text-xs">{text}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Payment Form (inside Elements provider) ──────────────────

function CheckoutPaymentForm({
  pricing,
  onSuccess,
}: {
  pricing: CheckoutPricing;
  onSuccess: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [confirming, setConfirming] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const handleSubmit = async () => {
    if (!stripe || !elements) return;
    setConfirming(true);
    setPaymentError(null);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/pro/onboarding?checkout=success`,
      },
      redirect: "if_required",
    });

    if (error) {
      setPaymentError(error.message || "Erreur lors du paiement");
      setConfirming(false);
    } else {
      onSuccess();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="space-y-4"
    >
      {/* CardCheckoutPaymentShellUNPRO */}
      <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
        {/* Secure payment header */}
        <div className="px-5 py-4 border-b border-border/30 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Lock className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-foreground">Paiement sécurisé</p>
            <p className="text-[11px] text-muted-foreground">
              Vos informations de paiement sont protégées par Stripe
            </p>
          </div>
          <Shield className="w-4 h-4 text-green-500 shrink-0" />
        </div>

        {/* Stripe Payment Element */}
        <div className="p-5">
          <PaymentElement
            onReady={() => setReady(true)}
            options={{
              layout: {
                type: "accordion",
                defaultCollapsed: false,
                radios: false,
                spacedAccordionItems: true,
              },
            }}
          />
        </div>

        {/* Error display */}
        <AnimatePresence>
          {paymentError && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="px-5 pb-4"
            >
              <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-destructive">{paymentError}</p>
                  <button
                    onClick={() => setPaymentError(null)}
                    className="text-[10px] text-destructive/70 underline mt-1"
                  >
                    Réessayer
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Confirm button */}
        <div className="px-5 pb-5">
          <Button
            className="w-full h-12 text-sm font-bold gap-2 rounded-xl"
            disabled={!stripe || !elements || confirming || !ready}
            onClick={handleSubmit}
          >
            {confirming ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Traitement en cours…
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                Confirmer et activer mon plan
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Trust strip */}
      <div className="flex items-center justify-center gap-4 py-2">
        {[
          { icon: Shield, label: "Paiement sécurisé" },
          { icon: CreditCard, label: "Stripe™" },
          { icon: Lock, label: "Données cryptées" },
        ].map(({ icon: Ic, label }, i) => (
          <div key={i} className="flex items-center gap-1 text-muted-foreground">
            <Ic className="w-3.5 h-3.5" />
            <span className="text-[10px]">{label}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Footer Sticky ─────────────────────────────────────────────

function FooterCheckoutStickyTotal({ pricing }: { pricing: CheckoutPricing }) {
  return (
    <div className="fixed bottom-0 inset-x-0 z-40 bg-background/95 backdrop-blur-xl border-t border-border/40 safe-area-bottom">
      <div className="max-w-lg mx-auto px-4 py-3 space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Total aujourd'hui</span>
          <span className="text-lg font-black text-foreground">{fmtCADExact(pricing.total_due_today)}</span>
        </div>
        <p className="text-center text-[10px] text-muted-foreground">
          {pricing.billing_interval === "year" ? "Facturation annuelle" : "Facturation mensuelle"} · Taxes incluses · Annulable selon les conditions du plan
        </p>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────

export default function PageCheckoutNativeScrollable() {
  const { planCode } = useParams<{ planCode: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const billingParam = searchParams.get("billing") as BillingInterval | null;
  const [interval, setInterval] = useState<BillingInterval>(billingParam === "month" ? "month" : "year");
  const [couponCode, setCouponCode] = useState<string | null>(null);
  const [intentKey, setIntentKey] = useState(0);

  // Backend pricing source of truth
  const { data: pricing, isLoading, isError } = useCheckoutPricing(planCode, interval, couponCode);

  // Stripe intent state
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [intentLoading, setIntentLoading] = useState(false);
  const [intentError, setIntentError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Fetch subscription intent from backend
  const fetchIntent = useCallback(async () => {
    if (!planCode) return;
    setIntentLoading(true);
    setIntentError(null);
    setClientSecret(null);

    try {
      const { data, error } = await supabase.functions.invoke("create-subscription-intent", {
        body: {
          planCode,
          billingInterval: interval,
          promoCode: couponCode || undefined,
        },
      });

      if (error) throw new Error(error.message || "Erreur de création du paiement");
      if (data?.error) throw new Error(data.error);

      if (data?.activated && data?.zero_total) {
        setSuccess(true);
        return;
      }

      if (!data?.clientSecret) throw new Error("Secret de paiement manquant");
      setClientSecret(data.clientSecret);
    } catch (err: any) {
      setIntentError(err.message || "Impossible de préparer le paiement");
    } finally {
      setIntentLoading(false);
    }
  }, [planCode, interval, couponCode]);

  useEffect(() => {
    fetchIntent();
  }, [fetchIntent, intentKey]);

  const handleIntervalChange = (iv: BillingInterval) => {
    setInterval(iv);
    setIntentKey((k) => k + 1);
  };

  const handleCouponApply = (code: string) => {
    setCouponCode(code);
    setIntentKey((k) => k + 1);
  };

  const handleCouponRemove = () => {
    setCouponCode(null);
    setIntentKey((k) => k + 1);
  };

  // ── Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Chargement du checkout…</p>
        </div>
      </div>
    );
  }

  // ── Error state
  if (isError || !pricing) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <p className="text-lg font-bold text-foreground">Plan introuvable</p>
          <p className="text-sm text-muted-foreground">Impossible de charger les informations de tarification.</p>
          <Button onClick={() => navigate("/pricing?tab=entrepreneurs")}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Retour aux plans
          </Button>
        </div>
      </div>
    );
  }

  // ── Success state
  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full text-center space-y-6 p-8"
        >
          <div className="w-16 h-16 rounded-2xl bg-green-500/10 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8 text-green-500" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-black text-foreground">Plan activé !</h1>
            <p className="text-sm text-muted-foreground">
              Votre plan {pricing.plan_name} est maintenant actif. Bienvenue !
            </p>
          </div>
          <Button onClick={() => navigate("/pro/onboarding?checkout=success")} className="gap-2">
            <Sparkles className="w-4 h-4" /> Commencer la configuration
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background overflow-y-auto">
      {/* ── Sticky header ── */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/30">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground truncate">Finaliser — {pricing.plan_name}</p>
            <p className="text-xs text-muted-foreground">Paiement sécurisé</p>
          </div>
          <Lock className="w-4 h-4 text-green-500 shrink-0" />
        </div>
      </div>

      {/* ── Scrollable content ── */}
      <div className="max-w-lg mx-auto px-4 py-6 space-y-5 pb-36">
        {/* 1. Plan Summary */}
        <PanelCheckoutPlanSummary
          pricing={pricing}
          interval={interval}
          onIntervalChange={handleIntervalChange}
        />

        {/* 2. Coupon */}
        <PanelCheckoutCouponInline
          planCode={planCode || ""}
          billingInterval={interval}
          appliedCoupon={couponCode}
          onApply={handleCouponApply}
          onRemove={handleCouponRemove}
        />

        {/* 3. Tax Breakdown */}
        <PanelCheckoutTaxBreakdown pricing={pricing} />

        {/* 4. Trust Signals */}
        <PanelCheckoutTrustSignals />

        {/* 5. Payment Section */}
        {intentLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-2xl border border-border/50 bg-card p-8"
          >
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Préparation du paiement sécurisé…</p>
            </div>
          </motion.div>
        )}

        {intentError && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5 space-y-3"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-destructive">Erreur de connexion au paiement</p>
                <p className="text-xs text-muted-foreground">{intentError}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setIntentKey((k) => k + 1)} className="gap-2">
              <RefreshCw className="w-3.5 h-3.5" /> Recharger le paiement
            </Button>
          </motion.div>
        )}

        {clientSecret && stripePromise && (
          <Elements
            key={clientSecret}
            stripe={stripePromise}
            options={{
              clientSecret,
              appearance: {
                theme: "night",
                variables: {
                  colorPrimary: "hsl(222, 100%, 60%)",
                  colorBackground: "hsl(222, 40%, 7%)",
                  colorText: "hsl(216, 30%, 95%)",
                  colorTextSecondary: "hsl(218, 18%, 52%)",
                  colorDanger: "hsl(0, 72%, 50%)",
                  fontFamily: "'Manrope', system-ui, sans-serif",
                  borderRadius: "12px",
                  spacingUnit: "4px",
                  fontSizeBase: "14px",
                  colorTextPlaceholder: "hsl(218, 18%, 40%)",
                },
                rules: {
                  ".Input": {
                    backgroundColor: "hsl(222, 25%, 11%)",
                    border: "1px solid hsl(222, 20%, 18%)",
                    boxShadow: "none",
                    padding: "12px 14px",
                    transition: "border-color 0.2s ease, box-shadow 0.2s ease",
                  },
                  ".Input:focus": {
                    border: "1px solid hsl(222, 100%, 60%)",
                    boxShadow: "0 0 0 3px hsl(222, 100%, 60%, 0.15)",
                  },
                  ".Label": {
                    color: "hsl(218, 18%, 52%)",
                    fontSize: "12px",
                    fontWeight: "600",
                    textTransform: "uppercase" as any,
                    letterSpacing: "0.05em",
                    marginBottom: "6px",
                  },
                  ".Tab": {
                    backgroundColor: "hsl(222, 25%, 11%)",
                    border: "1px solid hsl(222, 20%, 18%)",
                    borderRadius: "12px",
                  },
                  ".Tab--selected": {
                    backgroundColor: "hsl(222, 40%, 12%)",
                    border: "1px solid hsl(222, 100%, 60%)",
                  },
                  ".TabIcon": {
                    fill: "hsl(218, 18%, 52%)",
                  },
                  ".TabIcon--selected": {
                    fill: "hsl(222, 100%, 60%)",
                  },
                },
              },
              locale: "fr-CA",
            }}
          >
            <CheckoutPaymentForm
              pricing={pricing}
              onSuccess={() => setSuccess(true)}
            />
          </Elements>
        )}
      </div>

      {/* ── Sticky footer ── */}
      <FooterCheckoutStickyTotal pricing={pricing} />
    </div>
  );
}
