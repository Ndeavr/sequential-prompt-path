/**
 * SignatureOfferCard — Signature plan $2997 one-time, with SIGNATURE26 coupon = $0.01.
 * Uses real Stripe checkout.
 */
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Sparkles, Check, Loader2, Gift, Shield, Crown, CreditCard } from "lucide-react";
import { Input } from "@/components/ui/input";

interface Props {
  promoCode: string;
  onPromoChange: (code: string) => void;
  onActivate: () => void;
  isProcessing: boolean;
}

const SIGNATURE_FEATURES = [
  "Exclusivité territoriale éligible",
  "Tous les rendez-vous garantis (S à XXL)",
  "Accompagnement personnalisé Alex",
  "Demandes d'avis automatiques",
  "Analytics avancés et rapports",
  "Badge Signature premium",
  "Support prioritaire dédié",
  "Visibilité maximale",
];

export default function SignatureOfferCard({ promoCode, onPromoChange, onActivate, isProcessing }: Props) {
  const [codeApplied, setCodeApplied] = useState(false);
  const code = promoCode.toUpperCase();

  useEffect(() => {
    if (code === "SIGNATURE26") setCodeApplied(true);
  }, [code]);

  return (
    <div className="space-y-5">
      {/* Offer hero */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative rounded-2xl border border-primary/30 bg-gradient-to-br from-card to-primary/[0.04] p-6 space-y-4 overflow-hidden"
      >
        {/* Badge */}
        <div className="absolute top-3 right-3">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold uppercase tracking-wider">
            <Gift className="w-3 h-3" /> Offre exclusive
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <Crown className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Plan Signature</h2>
            <p className="text-xs text-muted-foreground">Le plan le plus complet</p>
          </div>
        </div>

        {/* Pricing */}
        <div className="flex items-baseline gap-3">
          <span className="text-2xl text-muted-foreground line-through font-semibold">2 997 $</span>
          {codeApplied && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="text-3xl font-bold text-green-500"
            >
              0,01 $
            </motion.span>
          )}
        </div>
        {codeApplied && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xs text-green-500 font-semibold"
          >
            🎉 Code SIGNATURE26 appliqué — 2 996,99 $ de rabais !
          </motion.p>
        )}

        {/* Features */}
        <div className="space-y-2 pt-2">
          {SIGNATURE_FEATURES.map((f) => (
            <div key={f} className="flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />
              <span className="text-xs text-foreground">{f}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Promo code input */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Code promotionnel</label>
        <div className="flex gap-2">
          <Input
            value={promoCode}
            onChange={(e) => onPromoChange(e.target.value.toUpperCase())}
            placeholder="SIGNATURE26"
            className="h-11 rounded-xl text-sm font-mono uppercase"
          />
          {codeApplied && (
            <div className="h-11 px-4 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center">
              <Check className="w-4 h-4 text-green-500" />
            </div>
          )}
        </div>
      </div>

      {/* Trust strip */}
      <div className="flex items-center gap-4 text-[10px] text-muted-foreground/60">
        <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> Paiement sécurisé Stripe</span>
        <span className="flex items-center gap-1"><CreditCard className="w-3 h-3" /> Transaction protégée</span>
      </div>

      {/* CTA */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        disabled={!codeApplied || isProcessing}
        onClick={onActivate}
        className="w-full h-14 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white font-bold text-base shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {isProcessing ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <>
            <Sparkles className="w-5 h-5" />
            {codeApplied ? "Payer 0,01 $ et activer" : "Procéder au paiement"}
          </>
        )}
      </motion.button>
    </div>
  );
}
