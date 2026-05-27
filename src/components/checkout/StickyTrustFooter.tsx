/**
 * StickyTrustFooter — Footer "Total aujourd'hui" enrichi pour le checkout.
 * Ajoute mini orbe Alex + trust micro-copy + bénéfice.
 */
import { motion } from "framer-motion";
import { Shield, Sparkles } from "lucide-react";

interface Props {
  totalLabel: string;
  totalValue: string;
  hint?: string;
}

export default function StickyTrustFooter({
  totalLabel,
  totalValue,
  hint = "Activation immédiate · Visibilité IA incluse",
}: Props) {
  return (
    <div className="fixed bottom-0 inset-x-0 z-40 border-t border-border/60 bg-background/95 backdrop-blur-xl">
      <div className="max-w-2xl mx-auto px-4 py-3 space-y-2">
        <div className="flex items-center gap-3">
          <motion.div
            animate={{ scale: [1, 1.06, 1] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center shadow-md shrink-0"
          >
            <Sparkles className="h-4 w-4 text-white" />
          </motion.div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-muted-foreground leading-tight">{totalLabel}</p>
            <p className="text-[10.5px] text-primary font-medium leading-tight truncate">{hint}</p>
          </div>
          <div className="text-right shrink-0">
            <span className="text-lg font-black text-foreground tabular-nums">{totalValue}</span>
          </div>
        </div>
        <div className="flex items-center justify-center gap-3 text-[10px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Shield className="h-2.5 w-2.5" /> Paiement Stripe
          </span>
          <span>·</span>
          <span>Annulable en tout temps</span>
          <span>·</span>
          <span>Données chiffrées</span>
        </div>
      </div>
    </div>
  );
}
