/**
 * UNPRO — Dedicated Native Scrollable Checkout Page
 * Full-page scrollable checkout with plan summary, coupon, Stripe Embedded Checkout, and sticky CTA.
 * Route: /checkout/native/:planCode
 */
import { useCallback, useState, useMemo } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from "@stripe/react-stripe-js";
import { motion } from "framer-motion";
import {
  ArrowLeft, Shield, Lock, CreditCard, Check, Star,
  Sparkles, Clock, Calendar, Users, TrendingUp, Crown,
  CheckCircle2, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { usePlanByCode, formatPlanPrice, getYearlySavingsPercent, type BillingInterval, type CatalogPlan } from "@/hooks/usePlanCatalog";
import FormCouponCodeInline from "@/components/coupon/FormCouponCodeInline";
import type { CouponValidationResult } from "@/hooks/useCoupons";
import { cn } from "@/lib/utils";

const STRIPE_PUBLISHABLE_KEY = "pk_live_Gw47doir5ZX9n9uM0nrBpKro";
const stripePromise = STRIPE_PUBLISHABLE_KEY.startsWith("pk_")
  ? loadStripe(STRIPE_PUBLISHABLE_KEY)
  : null;

const PLAN_ICONS: Record<string, React.ElementType> = {
  recrue: Users,
  pro: TrendingUp,
  premium: Star,
  elite: Crown,
  signature: Shield,
};

export default function PageCheckoutNativeScrollable() {
  const { planCode } = useParams<{ planCode: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const billingParam = searchParams.get("billing") as BillingInterval | null;
  const [interval, setInterval] = useState<BillingInterval>(billingParam === "month" ? "month" : "year");

  const { plan, isLoading } = usePlanByCode(planCode);

  const [couponResult, setCouponResult] = useState<CouponValidationResult | null>(null);
  const [checkoutKey, setCheckoutKey] = useState(0);

  const handleCouponChange = (result: CouponValidationResult | null) => {
    setCouponResult(result);
    setCheckoutKey((k) => k + 1);
  };

  const fetchClientSecret = useCallback(async () => {
    const body: Record<string, unknown> = {
      planId: planCode,
      billingInterval: interval,
      uiMode: "embedded",
      returnUrl: `${window.location.origin}/pro/onboarding?plan=${planCode}&checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    };

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <p className="text-lg font-bold text-foreground">Plan introuvable</p>
          <Button onClick={() => navigate("/pricing?tab=entrepreneurs")}>
            Retour aux plans
          </Button>
        </div>
      </div>
    );
  }

  const Icon = PLAN_ICONS[plan.code] || Users;
  const monthlyDisplay = interval === "year"
    ? Math.round(plan.yearlyPrice / 12)
    : plan.monthlyPrice;
  const savings = getYearlySavingsPercent(plan);
  const basePrice = monthlyDisplay / 100;

  return (
    <div className="min-h-screen bg-background overflow-y-auto">
      {/* ── Sticky header ── */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/30">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground truncate">Finaliser — {plan.name}</p>
            <p className="text-xs text-muted-foreground">Paiement sécurisé</p>
          </div>
          <Lock className="w-4 h-4 text-green-500 shrink-0" />
        </div>
      </div>

      {/* ── Scrollable content ── */}
      <div className="max-w-lg mx-auto px-4 py-6 space-y-5 pb-32">
        {/* Plan summary */}
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
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Votre plan</p>
                  <h2 className="text-xl font-black text-foreground">{plan.name}</h2>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black text-foreground">{formatPlanPrice(monthlyDisplay)}</p>
                <p className="text-xs text-muted-foreground">/mois</p>
              </div>
            </div>

            {/* Billing toggle */}
            <div className="flex rounded-xl bg-muted/50 p-1">
              {(["month", "year"] as BillingInterval[]).map((iv) => (
                <button
                  key={iv}
                  className={cn(
                    "flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all",
                    interval === iv
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => {
                    setInterval(iv);
                    setCheckoutKey((k) => k + 1);
                  }}
                >
                  {iv === "month" ? "Mensuel" : (
                    <span className="flex items-center justify-center gap-1">
                      Annuel
                      {savings > 0 && (
                        <span className="text-[10px] bg-green-500/20 text-green-600 px-1.5 py-0.5 rounded-full font-bold">
                          -{savings}%
                        </span>
                      )}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Key features */}
            <div className="space-y-1.5">
              {plan.features.slice(0, 4).map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                  <span className="text-muted-foreground text-xs">{f}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Coupon area */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-2xl border border-border/50 bg-card p-4"
        >
          <FormCouponCodeInline
            planCode={planCode || ""}
            billingInterval={interval}
            basePrice={basePrice}
            onCouponChange={handleCouponChange}
          />
        </motion.div>

        {/* Zero-total banner */}
        {couponResult?.valid && couponResult.discount_type === "percentage" && couponResult.discount_value === 100 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl border border-green-500/20 bg-green-500/5 p-4 text-center"
          >
            <p className="text-green-600 font-semibold text-sm">
              🎉 Votre plan sera activé gratuitement !
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Cliquez sur confirmer ci-dessous pour activer.
            </p>
          </motion.div>
        )}

        {/* Trust signals */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border border-border/50 bg-card p-4 space-y-3"
        >
          <p className="text-sm font-bold text-foreground">Après le paiement</p>
          <div className="space-y-2">
            {[
              { icon: Sparkles, text: "Plan activé immédiatement" },
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

        {/* ── Stripe Embedded Checkout ── */}
        {stripePromise && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <p className="text-sm font-bold text-foreground mb-3">Paiement</p>
            <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
              <EmbeddedCheckoutProvider
                key={`${planCode}-${interval}-${checkoutKey}`}
                stripe={stripePromise}
                options={{ fetchClientSecret }}
              >
                <EmbeddedCheckout className="min-h-0" />
              </EmbeddedCheckoutProvider>
            </div>
          </motion.div>
        )}

        {/* Trust strip */}
        <div className="flex items-center justify-center gap-4 py-3">
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
      </div>

      {/* ── Sticky footer CTA ── */}
      <div className="fixed bottom-0 inset-x-0 z-40 bg-background/90 backdrop-blur-xl border-t border-border/30 safe-area-bottom">
        <div className="max-w-lg mx-auto px-4 py-3 space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Montant facturé aujourd'hui</span>
            <span className="font-bold text-foreground">{formatPlanPrice(monthlyDisplay)}/mois</span>
          </div>
          <p className="text-center text-[10px] text-muted-foreground">
            Annulable à tout moment · Aucun frais caché · Taxes en sus
          </p>
        </div>
      </div>
    </div>
  );
}
