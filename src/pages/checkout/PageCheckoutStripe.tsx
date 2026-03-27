/**
 * Module 4 — Stripe Checkout Page
 * Shows plan summary, promo codes, trust signals, and redirects to Stripe.
 */
import { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Shield, Sparkles, Clock, Calendar, Check, Loader2, Lock, CreditCard, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getPlanById, formatPlanPrice, type ContractorPlan, type BillingInterval, getStripePriceId, getYearlySavingsPercent } from "@/config/contractorPlans";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import AppointmentUpsellCard from "@/components/goals/AppointmentUpsellCard";
import { formatCents, type PackTier } from "@/lib/appointmentPricing";
import PromoCodeInput from "@/components/checkout/PromoCodeInput";

const PLAN_ICONS: Record<string, string> = {
  recrue: "🛡️",
  pro: "⚡",
  premium: "⭐",
  elite: "👑",
  signature: "💎",
};

export default function PageCheckoutStripe() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { session } = useAuth();
  const [loading, setLoading] = useState(false);
  const [billingInterval, setBillingInterval] = useState<BillingInterval>("month");

  // Appointment pack from goals funnel
  const initialPack = useMemo(() => {
    try {
      const raw = sessionStorage.getItem("unpro_appointment_pack");
      return raw ? JSON.parse(raw) as PackTier : null;
    } catch { return null; }
  }, []);
  const [selectedPack, setSelectedPack] = useState<PackTier | null>(initialPack);
  // Get plan from URL or sessionStorage
  const planCode = params.get("plan") || (() => {
    try {
      const sel = sessionStorage.getItem("unpro_plan_selection");
      return sel ? JSON.parse(sel).plan : "pro";
    } catch { return "pro"; }
  })();

  const plan = useMemo(() => getPlanById(planCode), [planCode]);

  // Get objective context
  const context = useMemo(() => {
    try {
      const raw = sessionStorage.getItem("unpro_plan_selection");
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  }, []);

  if (!plan) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <p className="text-lg font-bold text-foreground">Plan introuvable</p>
          <Button onClick={() => navigate("/goals")}>Retour aux objectifs</Button>
        </div>
      </div>
    );
  }

  const displayPrice = billingInterval === "year"
    ? formatPlanPrice(Math.round(plan.yearlyPrice / 12))
    : formatPlanPrice(plan.monthlyPrice);

  const handleCheckout = async () => {
    if (!session?.access_token) {
      toast.error("Veuillez vous connecter pour continuer");
      navigate("/login?redirect=/checkout?plan=" + planCode);
      return;
    }

    setLoading(true);
    try {
      const priceId = getStripePriceId(plan, billingInterval);
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/create-checkout-session`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            priceId,
            planId: planCode,
            billingInterval,
            successUrl: `${window.location.origin}/checkout/success?plan=${planCode}`,
            cancelUrl: `${window.location.origin}/checkout?plan=${planCode}`,
            ...(selectedPack && {
              appointmentPack: {
                size: selectedPack.size,
                totalPriceCents: selectedPack.totalPriceCents,
                unitPriceCents: selectedPack.unitPriceCents,
              },
            }),
          }),
        }
      );

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erreur de paiement");
      }

      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la création du paiement");
    } finally {
      setLoading(false);
    }
  };

  const yearlySavings = getYearlySavingsPercent(plan);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/30">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <p className="text-sm font-bold text-foreground">Finaliser l'inscription</p>
            <p className="text-xs text-muted-foreground">Paiement sécurisé</p>
          </div>
          <Lock className="w-4 h-4 text-green-500" />
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5 pb-36">
        {/* Plan Summary */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl overflow-hidden premium-border"
        >
          <div className="bg-gradient-to-br from-card via-background to-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{PLAN_ICONS[planCode] || "⚡"}</span>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Votre plan</p>
                  <h2 className="text-xl font-black text-foreground">{plan.name}</h2>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black text-foreground">{displayPrice}</p>
                <p className="text-xs text-muted-foreground">/mois</p>
              </div>
            </div>

            {/* Billing toggle */}
            <div className="flex rounded-xl bg-muted/50 p-1">
              {(["month", "year"] as BillingInterval[]).map((interval) => (
                <button
                  key={interval}
                  className={cn(
                    "flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all",
                    billingInterval === interval
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => setBillingInterval(interval)}
                >
                  {interval === "month" ? "Mensuel" : (
                    <span className="flex items-center justify-center gap-1">
                      Annuel
                      {yearlySavings > 0 && (
                        <span className="text-[10px] bg-green-500/20 text-green-600 px-1.5 py-0.5 rounded-full font-bold">
                          -{yearlySavings}%
                        </span>
                      )}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Features */}
            <div className="space-y-1.5">
              {plan.features.map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <Check className="w-3.5 h-3.5 text-green-500 shrink-0" />
                  <span className="text-muted-foreground">{f}</span>
                </div>
              ))}
            </div>

            {/* Why reminder */}
            {context.primaryObjective && (
              <div className="rounded-xl bg-primary/5 border border-primary/10 p-3">
                <p className="text-xs text-primary font-semibold flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Choisi pour votre objectif
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Ce plan est recommandé selon votre analyse et vos objectifs de croissance.
                </p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Appointment pack upsell */}
        <AppointmentUpsellCard
          selectedPack={selectedPack}
          onSelectPack={setSelectedPack}
        />

        {/* Pack total line */}
        {selectedPack && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="rounded-xl bg-secondary/5 border border-secondary/10 p-3 flex items-center justify-between"
          >
            <p className="text-sm text-foreground font-medium">
              + {selectedPack.size} rendez-vous à la carte
            </p>
            <p className="text-sm font-bold text-foreground">{formatCents(selectedPack.totalPriceCents)}</p>
          </motion.div>
        )}

        {/* After payment */}
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
            ].map(({ icon: Icon, text }, i) => (
              <div key={i} className="flex items-center gap-2.5 text-sm">
                <div className="w-7 h-7 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                  <Icon className="w-3.5 h-3.5 text-green-500" />
                </div>
                <span className="text-muted-foreground">{text}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Trust strip */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex items-center justify-center gap-4 py-3"
        >
          {[
            { icon: Shield, label: "Paiement sécurisé" },
            { icon: CreditCard, label: "Stripe™" },
            { icon: Lock, label: "Données cryptées" },
          ].map(({ icon: Icon, label }, i) => (
            <div key={i} className="flex items-center gap-1 text-muted-foreground">
              <Icon className="w-3.5 h-3.5" />
              <span className="text-[10px]">{label}</span>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Sticky CTA */}
      <div className="fixed bottom-0 inset-x-0 z-30 bg-background/90 backdrop-blur-xl border-t border-border/30 p-4">
        <div className="max-w-lg mx-auto space-y-2">
          <Button
            size="lg"
            variant="premium"
            className="w-full h-14 rounded-xl text-base"
            onClick={handleCheckout}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <CreditCard className="w-4 h-4 mr-2" /> Payer {displayPrice}/mois{selectedPack ? ` + ${formatCents(selectedPack.totalPriceCents)}` : ""}
              </>
            )}
          </Button>
          <p className="text-center text-[10px] text-muted-foreground">
            Annulable à tout moment • Aucun frais caché • Taxes en sus
          </p>
        </div>
      </div>
    </div>
  );
}
