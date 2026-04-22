/**
 * Screen 8 — Stripe Checkout
 * Plan summary + coupon + tax breakdown + trust + sticky CTA + friendly errors.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CreditCard, Shield, Lock, Loader2, Tag, ArrowRight, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useActivationFunnel } from "@/hooks/useActivationFunnel";
import { useHesitationRescue } from "@/hooks/useHesitationRescue";
import { useToast } from "@/hooks/use-toast";
import FunnelLayout from "@/components/contractor-funnel/FunnelLayout";
import StickyMobileCTA from "@/components/ui/StickyMobileCTA";
import { friendlyError } from "@/utils/friendlyErrors";

const PLAN_DETAILS: Record<string, { name: string; monthly: number; yearly: number }> = {
  pro: { name: "Pro", monthly: 149, yearly: 119 },
  premium: { name: "Premium", monthly: 299, yearly: 249 },
  elite: { name: "Élite", monthly: 499, yearly: 399 },
};

const TPS_RATE = 0.05;
const TVQ_RATE = 0.09975;

export default function ScreenPayment() {
  const navigate = useNavigate();
  const { state, updateFunnel } = useActivationFunnel();
  const { toast } = useToast();
  const [coupon, setCoupon] = useState("");
  const [processing, setProcessing] = useState(false);
  useHesitationRescue({ screenKey: "payment" });

  const plan = PLAN_DETAILS[state.selected_plan || "premium"];
  const price = state.billing_cycle === "yearly" ? plan.yearly : plan.monthly;
  const tps = Math.round(price * TPS_RATE * 100) / 100;
  const tvq = Math.round(price * TVQ_RATE * 100) / 100;
  const total = Math.round((price + tps + tvq) * 100) / 100;
  const savings = state.billing_cycle === "yearly" ? (plan.monthly - plan.yearly) * 12 : 0;

  const handlePay = async () => {
    setProcessing(true);
    try {
      const planCode = state.selected_plan || "premium";
      const billingCycle = state.billing_cycle || "yearly";
      const { data, error } = await supabase.functions.invoke("create-stripe-checkout-session", {
        body: {
          plan_code: planCode,
          billing_cycle: billingCycle,
          coupon_code: coupon || undefined,
          onboarding_session_id: state.id || undefined,
        },
      });

      if (error) throw error;
      if (data?.url) {
        await updateFunnel({ stripe_session_id: data.session_id });
        window.location.href = data.url;
      } else {
        await updateFunnel({ payment_status: "paid" });
        navigate("/entrepreneur/activer/succes");
      }
    } catch (err: any) {
      toast({
        title: "Erreur de paiement",
        description: friendlyError(err),
        variant: "destructive",
      });
    }
    setProcessing(false);
  };

  return (
    <FunnelLayout currentStep="checkout" showProgress={false}>
      <motion.div
        className="max-w-md mx-auto pb-28 sm:pb-0"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-bold text-foreground mb-1">Finaliser le paiement</h1>
        <p className="text-sm text-muted-foreground mb-6">Activez votre profil UNPRO</p>

        {/* Plan summary */}
        <div className="rounded-xl border border-border/50 bg-card/50 p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-bold text-foreground">Plan {plan.name}</h3>
            <div className="text-right">
              <span className="text-2xl font-bold text-foreground">{price}$</span>
              <span className="text-xs text-muted-foreground">/mois</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Facturation {state.billing_cycle === "yearly" ? "annuelle" : "mensuelle"}
          </p>
          {savings > 0 && (
            <p className="text-xs text-emerald-500 font-medium mt-1">Économie de {savings}$/an</p>
          )}
        </div>

        {/* Tax breakdown */}
        <div className="rounded-xl border border-border/30 bg-card/30 p-3 mb-4 space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Sous-total</span><span>{price.toFixed(2)}$</span>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>TPS (5%)</span><span>{tps.toFixed(2)}$</span>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>TVQ (9,975%)</span><span>{tvq.toFixed(2)}$</span>
          </div>
          <div className="border-t border-border/30 pt-1 mt-1 flex justify-between text-sm font-semibold text-foreground">
            <span>Total</span><span>{total.toFixed(2)}$/mois</span>
          </div>
        </div>

        {/* Coupon */}
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Code promo" value={coupon} onChange={(e) => setCoupon(e.target.value)} className="pl-9" />
          </div>
          <Button variant="outline" size="sm" disabled={!coupon}>Appliquer</Button>
        </div>

        {/* What happens next */}
        <div className="rounded-xl border border-border/30 bg-card/30 p-3 mb-4">
          <p className="text-xs font-medium text-foreground mb-2">Après le paiement:</p>
          <ul className="space-y-1 text-xs text-muted-foreground">
            <li className="flex items-center gap-1.5">
              <ArrowRight className="w-3 h-3 text-primary shrink-0" />
              Votre profil vérifié sera activé immédiatement
            </li>
            <li className="flex items-center gap-1.5">
              <ArrowRight className="w-3 h-3 text-primary shrink-0" />
              Vous commencez à recevoir des rendez-vous
            </li>
            <li className="flex items-center gap-1.5">
              <ArrowRight className="w-3 h-3 text-primary shrink-0" />
              Annulez en tout temps, sans frais cachés
            </li>
          </ul>
        </div>

        {/* Trust signals */}
        <div className="flex items-center justify-center gap-4 mb-4">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Lock className="w-3 h-3" /> SSL sécurisé
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Shield className="w-3 h-3" /> Paiement Stripe
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <CreditCard className="w-3 h-3" /> Annulez en tout temps
          </div>
        </div>

        {/* Social proof */}
        <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground mb-6">
          <Users className="w-3.5 h-3.5" />
          <span>200+ entrepreneurs actifs au Québec</span>
        </div>

        {/* Desktop pay button */}
        <Button
          size="lg"
          className="w-full h-14 text-base font-semibold rounded-xl hidden sm:flex"
          onClick={handlePay}
          disabled={processing}
        >
          {processing ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <CreditCard className="w-5 h-5 mr-2" />}
          Payer {total.toFixed(2)}$/mois
        </Button>
      </motion.div>

      <StickyMobileCTA
        label={`Payer ${total.toFixed(2)}$/mois`}
        onClick={handlePay}
        disabled={processing}
        loading={processing}
        icon={processing ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <CreditCard className="w-5 h-5 mr-2" />}
      />
    </FunnelLayout>
  );
}
