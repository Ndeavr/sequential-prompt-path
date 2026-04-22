import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, CreditCard, Lock, Shield, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CONTRACTOR_PLANS, PLAN_PRICE_MAP } from "@/config/contractorPlans";

export default function PageOnboardingPayment() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const planCode = searchParams.get("plan") || "premium";
  const [isLoading, setIsLoading] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const { toast } = useToast();

  const planObj = CONTRACTOR_PLANS.find((p) => p.slug === planCode);
  const planName = planObj?.name || "Premium";
  const monthlyPrice = planObj?.monthlyPrice || 599;

  const currentPrice = billingCycle === "monthly" ? monthlyPrice : Math.round(monthlyPrice * 12 * 0.85);
  const savings = billingCycle === "yearly" ? Math.round(monthlyPrice * 12 - currentPrice) : 0;

  const handleCheckout = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-stripe-checkout-session", {
        body: {
          plan_code: planCode,
          billing_cycle: billingCycle,
          coupon_code: couponCode || undefined,
        },
      });

      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("Aucune URL de checkout reçue");
      }
    } catch (err: any) {
      toast({
        title: "Erreur de paiement",
        description: err.message || "Impossible de lancer le paiement. Réessayez.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Paiement sécurisé
          </h1>
          <p className="text-xs text-muted-foreground">Étape 4/5 — Activez votre plan {planNames[planCode]}</p>
        </div>
      </div>

      {/* Plan Summary */}
      <Card className="border-primary/20">
        <CardContent className="p-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-foreground">Plan {planNames[planCode]}</span>
            <span className="text-xl font-black text-foreground">{currentPrice}$</span>
          </div>

          {/* Billing Toggle */}
          <div className="flex gap-2">
            <button
              className={`flex-1 text-xs py-2 rounded-lg border transition-all ${
                billingCycle === "monthly" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
              }`}
              onClick={() => setBillingCycle("monthly")}
            >
              Mensuel
            </button>
            <button
              className={`flex-1 text-xs py-2 rounded-lg border transition-all ${
                billingCycle === "yearly" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
              }`}
              onClick={() => setBillingCycle("yearly")}
            >
              Annuel {savings > 0 && <span className="text-emerald-400 ml-1">-{savings}$</span>}
            </button>
          </div>

          {/* Coupon */}
          <div className="flex gap-2">
            <Input
              placeholder="Code promo"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              className="text-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* Trust Signals */}
      <div className="flex items-center gap-4 justify-center text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><Lock className="h-3 w-3" /> SSL 256-bit</span>
        <span className="flex items-center gap-1"><Shield className="h-3 w-3" /> Stripe sécurisé</span>
      </div>

      {/* CTA */}
      <Button className="w-full" size="lg" onClick={handleCheckout} disabled={isLoading}>
        {isLoading ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Redirection…</>
        ) : (
          `Payer ${currentPrice}$ — Activer mon plan`
        )}
      </Button>

      <p className="text-[10px] text-center text-muted-foreground">
        Annulation possible à tout moment. Taxes applicables en sus.
      </p>
    </div>
  );
}
