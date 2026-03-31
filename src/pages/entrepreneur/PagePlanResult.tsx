/**
 * UNPRO — Plan Result Page (pre-checkout)
 * Displays the accepted pricing quote and redirects to Stripe Checkout.
 */
import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CreditCard, Shield, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { createPricingCheckout, type PricingCalcResult } from "@/services/pricingEngineService";

export default function PagePlanResult() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const quoteId = searchParams.get("quote_id");
  const [result, setResult] = useState<PricingCalcResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem("unpro_pricing_result");
    if (stored) {
      setResult(JSON.parse(stored));
    } else if (!quoteId) {
      navigate("/entrepreneur/pricing-calculator", { replace: true });
    }
  }, [quoteId, navigate]);

  const handleCheckout = async () => {
    const id = quoteId || result?.quote_id;
    if (!id) {
      toast.error("Quote introuvable");
      return;
    }
    setLoading(true);
    try {
      const { url } = await createPricingCheckout(id);
      if (url) {
        window.location.href = url;
      } else {
        toast.error("Erreur lors de la création du checkout");
      }
    } catch (e: any) {
      toast.error(e.message || "Erreur de paiement");
    } finally {
      setLoading(false);
    }
  };

  if (!result) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const { amounts, selected_plan, category, market, billing_period, projections } = result;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-4 py-16 space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <CreditCard className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-extrabold text-foreground font-display mb-2">Confirmer et payer</h1>
          <p className="text-sm text-muted-foreground">
            Plan {selected_plan.name} · {category.name} · {market.name}
          </p>
        </motion.div>

        {/* Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card rounded-2xl border border-border p-5 space-y-3"
        >
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Plan {selected_plan.name}</span>
            <span className="font-bold text-foreground">{amounts.adjusted_plan.toFixed(2)} $</span>
          </div>
          {amounts.rendezvous > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{projections.total_rendezvous} rendez-vous garantis</span>
              <span className="font-bold text-foreground">{amounts.rendezvous.toFixed(2)} $</span>
            </div>
          )}
          <div className="border-t border-border pt-2 flex justify-between text-sm">
            <span className="text-muted-foreground">Sous-total</span>
            <span className="font-bold">{amounts.subtotal.toFixed(2)} $</span>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>TPS (5%)</span>
            <span>{amounts.gst.toFixed(2)} $</span>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>TVQ (9.975%)</span>
            <span>{amounts.qst.toFixed(2)} $</span>
          </div>
          <div className="border-t border-border pt-2 flex justify-between">
            <span className="font-bold text-foreground">Total</span>
            <span className="text-xl font-extrabold text-primary">
              {amounts.total.toFixed(2)} $
              <span className="text-xs text-muted-foreground font-normal ml-1">
                /{billing_period === "year" ? "an" : "mois"}
              </span>
            </span>
          </div>
        </motion.div>

        {/* Trust badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex items-center justify-center gap-4 text-xs text-muted-foreground"
        >
          <div className="flex items-center gap-1">
            <Shield className="w-3.5 h-3.5" />
            Paiement sécurisé
          </div>
          <div className="flex items-center gap-1">
            <Shield className="w-3.5 h-3.5" />
            Annulable en tout temps
          </div>
        </motion.div>

        {/* CTA */}
        <Button
          onClick={handleCheckout}
          disabled={loading}
          className="w-full h-14 rounded-2xl text-base font-bold gap-2"
          size="lg"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              Procéder au paiement
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </Button>

        <Button variant="ghost" onClick={() => navigate(-1)} className="w-full text-sm">
          Retour
        </Button>
      </div>
    </div>
  );
}
