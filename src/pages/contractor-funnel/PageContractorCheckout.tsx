/**
 * UNPRO — PageContractorCheckout
 * Summary, Stripe checkout, founder offer.
 */
import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, CreditCard, Shield, Lock, CheckCircle2, Gift, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import FunnelLayout from "@/components/contractor-funnel/FunnelLayout";
import CardGlass from "@/components/unpro/CardGlass";
import { useContractorFunnel } from "@/hooks/useContractorFunnel";
import { useAuth } from "@/hooks/useAuth";
import { fadeUp, staggerContainer } from "@/lib/motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

import { CONTRACTOR_PLANS } from "@/config/contractorPlans";

const PLAN_DETAILS: Record<string, { name: string; price: number; features: string[] }> = Object.fromEntries(
  CONTRACTOR_PLANS.map((p) => [p.slug, { name: p.name, price: p.monthlyPrice, features: p.features }])
);

export default function PageContractorCheckout() {
  const { state, goToStep } = useContractorFunnel();
  const { isAuthenticated, isLoading: authLoading, session } = useAuth();
  const navigate = useNavigate();
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const plan = PLAN_DETAILS[state.selectedPlanId || "premium"];
  const planName = plan?.name || "Premium";
  const planPrice = plan?.price || 299;

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      sessionStorage.setItem("unpro_funnel_redirect", "/entrepreneur/checkout");
      toast.info("Connectez-vous pour finaliser votre paiement");
      navigate("/login", { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  const tax = Math.round(planPrice * 0.14975 * 100) / 100;
  const total = planPrice + tax;

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleCheckout = async () => {
    if (!session?.access_token) {
      toast.error("Session expirée. Veuillez vous reconnecter.");
      return;
    }
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout-session", {
        body: {
          planId: state.selectedPlanId || "premium",
          billingInterval: "month",
          successUrl: `${window.location.origin}/entrepreneur/activation`,
          cancelUrl: `${window.location.origin}/entrepreneur/checkout`,
        },
      });

      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      } else if (data?.activated) {
        toast.success(data.message || "Plan activé!");
        goToStep("activation");
      } else {
        toast.error("Erreur lors de la création du checkout");
      }
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la création du checkout");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Paiement — Plan {planName} | UNPRO</title>
      </Helmet>

      <FunnelLayout currentStep="checkout">
        <div className="max-w-xl mx-auto">
          <motion.div initial="hidden" animate="visible" variants={fadeUp} className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 mb-4">
              <CreditCard className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold font-display text-foreground mb-2">
              Finaliser l'activation
            </h1>
            <p className="text-sm text-muted-foreground">
              Plan {planName} — Paiement sécurisé
            </p>
          </motion.div>

          <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="space-y-4">
            {/* Founder offer banner */}
            <motion.div variants={fadeUp}>
              <div className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20">
                <Gift className="h-5 w-5 text-primary flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Offre Fondateur 🎉</p>
                  <p className="text-xs text-muted-foreground">
                    Tarif exclusif pour les premiers entrepreneurs. Garanti à vie.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Plan summary */}
            <motion.div variants={fadeUp}>
              <CardGlass noAnimation elevated>
                <h3 className="text-sm font-semibold text-foreground mb-3">Récapitulatif — Plan {planName}</h3>
                <div className="space-y-2 mb-4">
                  {plan?.features.map((f) => (
                    <div key={f} className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                      <span className="text-xs text-foreground/80">{f}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-border/50 pt-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Plan {planName} / mois</span>
                    <span className="text-foreground">{planPrice.toFixed(2)} $</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">TPS + TVQ</span>
                    <span className="text-foreground">{tax.toFixed(2)} $</span>
                  </div>
                  <div className="flex justify-between text-base font-bold border-t border-border/50 pt-2">
                    <span className="text-foreground">Total</span>
                    <span className="text-foreground">{total.toFixed(2)} $ /mois</span>
                  </div>
                </div>
              </CardGlass>
            </motion.div>

            {/* Terms */}
            <motion.div variants={fadeUp}>
              <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/30">
                <Checkbox
                  checked={acceptTerms}
                  onCheckedChange={(v) => setAcceptTerms(v === true)}
                  id="terms"
                />
                <label htmlFor="terms" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
                  J'accepte les conditions d'utilisation et la politique de confidentialité d'UNPRO.
                  Je comprends que l'abonnement sera renouvelé automatiquement chaque mois.
                </label>
              </div>
            </motion.div>

            {/* Trust signals */}
            <motion.div variants={fadeUp}>
              <div className="flex items-center justify-center gap-4 py-3">
                <div className="flex items-center gap-1.5">
                  <Lock className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">SSL 256-bit</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Shield className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Stripe sécurisé</span>
                </div>
              </div>
            </motion.div>

            {/* Actions */}
            <motion.div variants={fadeUp} className="flex flex-col gap-3">
              <Button
                className="w-full h-14 rounded-xl text-base font-semibold bg-gradient-to-r from-primary to-secondary hover:opacity-90 shadow-[var(--shadow-glow)] disabled:opacity-40"
                disabled={!acceptTerms || isLoading}
                onClick={handleCheckout}
              >
                <CreditCard className="mr-2 h-5 w-5" />
                {isLoading ? "Redirection..." : `Payer ${total.toFixed(2)} $ /mois`}
              </Button>
              <Button variant="ghost" onClick={() => goToStep("plan_recommendation")} className="text-sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Modifier mon plan
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </FunnelLayout>
    </>
  );
}
