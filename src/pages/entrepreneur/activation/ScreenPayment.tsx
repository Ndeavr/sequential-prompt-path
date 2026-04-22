/**
 * Screen 8 — Stripe Checkout
 * Plan summary + coupon + pay button.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CreditCard, Shield, Lock, Loader2, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useActivationFunnel } from "@/hooks/useActivationFunnel";
import { useToast } from "@/hooks/use-toast";
import FunnelLayout from "@/components/contractor-funnel/FunnelLayout";

const PLAN_DETAILS: Record<string, { name: string; monthly: number; yearly: number }> = {
  pro: { name: "Pro", monthly: 149, yearly: 119 },
  premium: { name: "Premium", monthly: 299, yearly: 249 },
  elite: { name: "Élite", monthly: 499, yearly: 399 },
};

export default function ScreenPayment() {
  const navigate = useNavigate();
  const { state, updateFunnel } = useActivationFunnel();
  const { toast } = useToast();
  const [coupon, setCoupon] = useState("");
  const [processing, setProcessing] = useState(false);

  const plan = PLAN_DETAILS[state.selected_plan || "premium"];
  const price = state.billing_cycle === "yearly" ? plan.yearly : plan.monthly;
  const savings = state.billing_cycle === "yearly"
    ? (plan.monthly - plan.yearly) * 12
    : 0;

  const handlePay = async () => {
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-stripe-checkout-session", {
        body: {
          plan_code: state.selected_plan,
          billing_cycle: state.billing_cycle,
          coupon_code: coupon || undefined,
          success_url: `${window.location.origin}/entrepreneur/activer/succes`,
          cancel_url: `${window.location.origin}/entrepreneur/activer/paiement`,
        },
      });

      if (error) throw error;
      if (data?.url) {
        await updateFunnel({ stripe_session_id: data.session_id });
        window.location.href = data.url;
      } else {
        // Demo mode — simulate payment
        await updateFunnel({ payment_status: "paid" });
        navigate("/entrepreneur/activer/succes");
      }
    } catch (err: any) {
      toast({
        title: "Erreur de paiement",
        description: err?.message || "Veuillez réessayer",
        variant: "destructive",
      });
    }
    setProcessing(false);
  };

  return (
    <FunnelLayout currentStep="checkout" showProgress={false}>
      <motion.div
        className="max-w-md mx-auto"
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
            <p className="text-xs text-emerald-500 font-medium mt-1">
              Économie de {savings}$/an
            </p>
          )}
        </div>

        {/* Coupon */}
        <div className="flex gap-2 mb-6">
          <div className="relative flex-1">
            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Code promo"
              value={coupon}
              onChange={(e) => setCoupon(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button variant="outline" size="sm" disabled={!coupon}>
            Appliquer
          </Button>
        </div>

        {/* Trust signals */}
        <div className="flex items-center justify-center gap-4 mb-6">
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

        {/* Pay button */}
        <Button
          size="lg"
          className="w-full h-14 text-base font-semibold rounded-xl"
          onClick={handlePay}
          disabled={processing}
        >
          {processing ? (
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
          ) : (
            <CreditCard className="w-5 h-5 mr-2" />
          )}
          Payer {price}$/mois
        </Button>
      </motion.div>
    </FunnelLayout>
  );
}
