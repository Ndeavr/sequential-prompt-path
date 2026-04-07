
import { motion } from "framer-motion";
import { Check, Crown, Star, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FounderPlan } from "@/hooks/useFounderPlans";
import { useFounderCheckout } from "@/hooks/useFounderPlans";
import { useAuth } from "@/hooks/useAuth";
import CounterLiveSpots from "./CounterLiveSpots";
import { useState } from "react";
import { toast } from "sonner";

interface Props {
  plan: FounderPlan;
  recommended?: boolean;
  delay?: number;
}

export default function CardPlanFounder({ plan, recommended, delay = 0 }: Props) {
  const { checkout } = useFounderCheckout();
  const { session } = useAuth();
  const [loading, setLoading] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [showPromo, setShowPromo] = useState(false);

  const priceFormatted = (plan.price / 100).toLocaleString("fr-CA");
  const valueFormatted = (plan.value_total / 100).toLocaleString("fr-CA");
  const isSoldOut = plan.status === "sold_out" || plan.spots_remaining <= 0;

  const handleCheckout = async () => {
    if (!user) {
      toast.error("Connectez-vous pour réserver votre place");
      return;
    }
    setLoading(true);
    try {
      await checkout(plan.slug, promoCode || undefined);
    } catch (err: any) {
      toast.error(err.message || "Erreur lors du paiement");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay }}
      className={`relative rounded-2xl border p-6 md:p-8 space-y-6 ${
        recommended
          ? "border-primary/40 bg-gradient-to-b from-primary/5 via-card/80 to-card/50 shadow-glow"
          : "border-border/40 bg-card/50 backdrop-blur"
      }`}
    >
      {recommended && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center gap-1">
          <Star className="h-3 w-3" /> RECOMMANDÉ
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Crown className={`h-5 w-5 ${recommended ? "text-primary" : "text-muted-foreground"}`} />
          <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
        </div>
        <div className="space-y-1">
          <div className="text-3xl md:text-4xl font-bold text-foreground">{priceFormatted} $</div>
          <p className="text-xs text-muted-foreground">Paiement unique · {plan.duration_years} ans</p>
          <p className="text-xs text-primary font-medium">Valeur réelle : {valueFormatted} $</p>
        </div>
      </div>

      <CounterLiveSpots remaining={plan.spots_remaining} total={plan.max_spots} />

      <ul className="space-y-2.5">
        {plan.features.map((f) => (
          <li key={f.key} className="flex items-start gap-2 text-sm text-muted-foreground">
            <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            {f.label}
          </li>
        ))}
      </ul>

      <div className="space-y-3 pt-2">
        <Button
          variant={recommended ? "premium" : "default"}
          size="xl"
          className="w-full"
          disabled={isSoldOut || loading}
          onClick={handleCheckout}
        >
          {loading ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Réservation...</>
          ) : isSoldOut ? (
            "Complet"
          ) : (
            "Réserver ma place"
          )}
        </Button>

        {!showPromo ? (
          <button
            onClick={() => setShowPromo(true)}
            className="w-full text-center text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            Vous avez un code promo ?
          </button>
        ) : (
          <div className="flex gap-2">
            <input
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value)}
              placeholder="Code promo"
              className="flex-1 h-8 px-3 rounded-lg bg-muted/30 border border-border/40 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
            />
            <Button size="sm" variant="soft" onClick={handleCheckout} disabled={!promoCode || loading}>
              Appliquer
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
