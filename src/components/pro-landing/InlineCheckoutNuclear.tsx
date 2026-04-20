/**
 * InlineCheckoutNuclear — Embedded Stripe checkout for /pro/:slug.
 *
 * - Mobile-first, dark glass styling matching the Nuclear Close landing.
 * - Monthly / Annual / Founder toggle (Founder = one-time).
 * - Recommended plan auto-selected from category opportunity score.
 * - Coupon support via existing FormCouponCodeInline.
 * - Taxes auto via Stripe Tax on the embedded session.
 * - Tracks: view_checkout / start_checkout / complete_checkout / abandon_checkout.
 * - Login required → returns to /pro/:slug?reopen=checkout.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from "@stripe/react-stripe-js";
import { motion } from "framer-motion";
import { Crown, ShieldCheck, Lock, Loader2, ArrowRight, BadgePercent } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { usePlanCatalog, type BillingInterval, type CatalogPlan } from "@/hooks/usePlanCatalog";
import FormCouponCodeInline from "@/components/coupon/FormCouponCodeInline";
import type { CouponValidationResult } from "@/hooks/useCoupons";

const STRIPE_PUBLISHABLE_KEY = "pk_live_Gw47doir5ZX9n9uM0nrBpKro";
const stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);

type Mode = "month" | "year" | "founder";

interface Props {
  prospectId: string;
  prospectSlug: string;
  category: string;
  city: string;
  opportunityScore: number;
  onTrack: (event: string, payload?: Record<string, unknown>) => void;
}

/** Pick the recommended plan based on opportunity & catalog. */
function pickRecommendedPlan(plans: CatalogPlan[], opportunity: number): CatalogPlan | null {
  if (!plans.length) return null;
  const subs = plans.filter((p) => p.billingMode === "subscription");
  if (!subs.length) return plans[0];
  // High opportunity → suggest the highlighted/top tier; otherwise mid tier
  if (opportunity >= 70) {
    return subs.find((p) => p.highlighted) ?? subs[subs.length - 1];
  }
  return subs[Math.min(1, subs.length - 1)];
}

export default function InlineCheckoutNuclear({
  prospectId,
  prospectSlug,
  category,
  city,
  opportunityScore,
  onTrack,
}: Props) {
  const { data: plans = [], isLoading } = usePlanCatalog();
  const [mode, setMode] = useState<Mode>("month");
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [couponResult, setCouponResult] = useState<CouponValidationResult | null>(null);
  const [checkoutKey, setCheckoutKey] = useState(0);
  const [showStripe, setShowStripe] = useState(false);
  const [authNeeded, setAuthNeeded] = useState(false);
  const trackedView = useRef(false);
  const trackedStart = useRef(false);
  const completedRef = useRef(false);

  const recommended = useMemo(
    () => pickRecommendedPlan(plans, opportunityScore),
    [plans, opportunityScore]
  );

  const founderPlan = useMemo(
    () => plans.find((p) => p.billingMode === "one_time" && /fond|founder/i.test(p.code)) ?? null,
    [plans]
  );

  // Default selection
  useEffect(() => {
    if (!selectedCode && recommended) setSelectedCode(recommended.code);
  }, [recommended, selectedCode]);

  const activePlan = useMemo(() => {
    if (mode === "founder") return founderPlan;
    return plans.find((p) => p.code === selectedCode) ?? recommended;
  }, [mode, plans, selectedCode, recommended, founderPlan]);

  const interval: BillingInterval = mode === "year" ? "year" : "month";

  const basePrice = useMemo(() => {
    if (!activePlan) return 0;
    if (mode === "founder") return activePlan.oneTimePrice;
    return mode === "year" ? activePlan.yearlyPrice : activePlan.monthlyPrice;
  }, [activePlan, mode]);

  // view_checkout
  useEffect(() => {
    if (trackedView.current || !activePlan) return;
    trackedView.current = true;
    onTrack("view_checkout", { plan_code: activePlan.code, mode });
  }, [activePlan, mode, onTrack]);

  // abandon detection
  useEffect(() => {
    const onLeave = () => {
      if (showStripe && !completedRef.current) {
        onTrack("abandon_checkout", { plan_code: activePlan?.code, mode });
      }
    };
    window.addEventListener("beforeunload", onLeave);
    return () => {
      window.removeEventListener("beforeunload", onLeave);
      onLeave();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showStripe]);

  const fetchClientSecret = useCallback(async () => {
    if (!activePlan) throw new Error("Plan introuvable");

    // Auth check — if not logged in, route to /auth and come back.
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      setAuthNeeded(true);
      const returnTo = `/pro/${prospectSlug}?reopen=checkout&plan=${activePlan.code}&mode=${mode}`;
      window.location.href = `/auth?role=contractor&redirect=${encodeURIComponent(returnTo)}`;
      throw new Error("AUTH_REQUIRED");
    }

    const body: Record<string, unknown> = {
      planId: activePlan.code,
      billingInterval: interval,
      uiMode: "embedded",
      returnUrl: `${window.location.origin}/pro/${prospectSlug}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      metadata: {
        prospect_id: prospectId,
        prospect_slug: prospectSlug,
        funnel: "nuclear_close",
        category,
        city,
      },
    };
    if (couponResult?.valid && couponResult.code) body.promoCode = couponResult.code;

    const { data, error } = await supabase.functions.invoke("create-checkout-session", { body });
    if (error || !data?.clientSecret) {
      throw new Error(error?.message || "Impossible de créer la session de paiement");
    }
    return data.clientSecret as string;
  }, [activePlan, interval, couponResult, prospectId, prospectSlug, category, city, mode]);

  const handleStart = () => {
    if (!activePlan) return;
    if (!trackedStart.current) {
      trackedStart.current = true;
      onTrack("start_checkout", { plan_code: activePlan.code, mode, base_price: basePrice });
    }
    setShowStripe(true);
  };

  // Detect success via URL flag
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") === "success" && !completedRef.current) {
      completedRef.current = true;
      onTrack("complete_checkout", {
        plan_code: activePlan?.code ?? selectedCode,
        mode,
        session_id: params.get("session_id"),
      });
    }
  }, [activePlan, selectedCode, mode, onTrack]);

  // Reopen checkout after login
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("reopen") === "checkout") {
      const planCode = params.get("plan");
      const m = (params.get("mode") as Mode) || "month";
      if (planCode) setSelectedCode(planCode);
      setMode(m);
      setTimeout(() => setShowStripe(true), 250);
    }
  }, []);

  if (isLoading || !activePlan) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-center backdrop-blur-xl">
        <Loader2 className="mx-auto h-5 w-5 animate-spin text-white/60" />
        <p className="mt-2 text-sm text-white/60">Chargement de votre offre…</p>
      </div>
    );
  }

  const subscriptionPlans = plans.filter((p) => p.billingMode === "subscription");
  const displayPrice = mode === "year"
    ? `${(activePlan.yearlyPrice / 100).toFixed(0)} $/an`
    : mode === "founder"
      ? `${(activePlan.oneTimePrice / 100).toFixed(0)} $ une seule fois`
      : `${(activePlan.monthlyPrice / 100).toFixed(0)} $/mois`;

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/15 via-white/[0.04] to-fuchsia-500/10 p-5 backdrop-blur-xl md:p-7"
    >
      <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-wider text-primary/80">
        <Crown className="h-3.5 w-3.5" /> Activation immédiate
      </div>
      <h2 className="text-balance text-2xl font-semibold text-white md:text-3xl">
        Votre territoire {city} — réservez en moins de 60 secondes
      </h2>
      <p className="mt-1 text-sm text-white/70">
        Aucun redirect. Paiement sécurisé Stripe. Annulation en tout temps.
      </p>

      {/* Mode toggle */}
      <div className="mt-5 inline-flex w-full overflow-hidden rounded-xl border border-white/10 bg-white/[0.04] p-1 text-xs md:w-auto">
        {([
          { v: "month", label: "Mensuel" },
          { v: "year", label: "Annuel · -2 mois" },
          ...(founderPlan ? [{ v: "founder" as const, label: "Fondateur" }] : []),
        ] as Array<{ v: Mode; label: string }>).map((opt) => (
          <button
            key={opt.v}
            onClick={() => {
              setMode(opt.v);
              if (opt.v === "founder" && founderPlan) setSelectedCode(founderPlan.code);
              else if (recommended) setSelectedCode(recommended.code);
              setShowStripe(false);
              setCheckoutKey((k) => k + 1);
            }}
            className={`flex-1 rounded-lg px-3 py-2 transition md:flex-none ${
              mode === opt.v
                ? "bg-primary text-primary-foreground shadow"
                : "text-white/70 hover:text-white"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Plan selector (sub modes only) */}
      {mode !== "founder" && subscriptionPlans.length > 1 && (
        <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-3">
          {subscriptionPlans.map((p) => {
            const isActive = p.code === selectedCode;
            const isRec = p.code === recommended?.code;
            return (
              <button
                key={p.code}
                onClick={() => {
                  setSelectedCode(p.code);
                  setShowStripe(false);
                  setCheckoutKey((k) => k + 1);
                }}
                className={`relative rounded-xl border p-3 text-left transition ${
                  isActive
                    ? "border-primary/60 bg-primary/15"
                    : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                }`}
              >
                {isRec && (
                  <span className="absolute right-2 top-2 rounded-full bg-amber-300/90 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-amber-950">
                    Recommandé
                  </span>
                )}
                <p className="text-xs uppercase tracking-wider text-white/60">{p.name}</p>
                <p className="mt-1 text-base font-semibold text-white">
                  {mode === "year"
                    ? `${(p.yearlyPrice / 100).toFixed(0)} $/an`
                    : `${(p.monthlyPrice / 100).toFixed(0)} $/mois`}
                </p>
              </button>
            );
          })}
        </div>
      )}

      {/* Selected summary */}
      <div className="mt-5 flex flex-wrap items-end justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wider text-white/55">Plan sélectionné</p>
          <p className="truncate text-lg font-semibold text-white">{activePlan.name}</p>
          {activePlan.shortPitch && (
            <p className="mt-0.5 truncate text-xs text-white/60">{activePlan.shortPitch}</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-[11px] uppercase tracking-wider text-white/55">À payer</p>
          <p className="text-2xl font-semibold tabular-nums text-white">{displayPrice}</p>
          <p className="text-[10px] text-white/50">Taxes calculées automatiquement</p>
        </div>
      </div>

      {/* Coupon */}
      <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
        <div className="mb-1 flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-white/55">
          <BadgePercent className="h-3 w-3" /> Code promo
        </div>
        <FormCouponCodeInline
          planCode={activePlan.code}
          billingInterval={interval}
          basePrice={basePrice}
          onCouponChange={(r) => {
            setCouponResult(r);
            setCheckoutKey((k) => k + 1);
          }}
        />
      </div>

      {/* CTA / Stripe */}
      {!showStripe ? (
        <div className="mt-5 space-y-3">
          <Button
            size="lg"
            onClick={handleStart}
            className="h-14 w-full rounded-xl bg-gradient-to-r from-primary to-fuchsia-500 text-base font-semibold text-white shadow-lg hover:opacity-95"
          >
            Activer mon territoire — {displayPrice}
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
          {authNeeded && (
            <p className="text-center text-xs text-amber-200">
              Connexion requise — redirection en cours…
            </p>
          )}

          {/* Trust badges */}
          <div className="grid grid-cols-3 gap-2 text-[10px] text-white/60">
            <div className="flex items-center justify-center gap-1 rounded-lg border border-white/10 bg-white/[0.03] px-2 py-2">
              <Lock className="h-3 w-3 text-emerald-300" /> Stripe SSL
            </div>
            <div className="flex items-center justify-center gap-1 rounded-lg border border-white/10 bg-white/[0.03] px-2 py-2">
              <ShieldCheck className="h-3 w-3 text-emerald-300" /> Sans engagement
            </div>
            <div className="flex items-center justify-center gap-1 rounded-lg border border-white/10 bg-white/[0.03] px-2 py-2">
              <Crown className="h-3 w-3 text-amber-300" /> Territoire exclusif
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-5 overflow-hidden rounded-xl border border-white/10 bg-white">
          <EmbeddedCheckoutProvider
            key={`${activePlan.code}-${interval}-${mode}-${checkoutKey}`}
            stripe={stripePromise}
            options={{ fetchClientSecret }}
          >
            <EmbeddedCheckout />
          </EmbeddedCheckoutProvider>
        </div>
      )}
    </motion.section>
  );
}
