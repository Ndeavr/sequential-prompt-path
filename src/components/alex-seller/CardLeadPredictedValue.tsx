/**
 * UNPRO — Lead Predicted Value Card
 */
import { motion } from "framer-motion";
import { DollarSign, TrendingUp } from "lucide-react";

interface Props {
  contractValue?: number;
  closeProb?: number;
  qualityScore?: number;
  confidence?: number;
}

const fmt = (v: number) =>
  new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(v);

export default function CardLeadPredictedValue({ contractValue, closeProb, qualityScore, confidence }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border/20 bg-card/50 p-3 space-y-2"
    >
      <div className="flex items-center gap-2">
        <DollarSign className="h-4 w-4 text-primary" />
        <span className="text-xs font-semibold text-foreground">Valeur prédite</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-lg font-bold text-primary">{contractValue ? fmt(contractValue) : "—"}</p>
          <p className="text-[9px] text-muted-foreground">Valeur contrat</p>
        </div>
        <div>
          <p className="text-lg font-bold text-foreground">{closeProb != null ? `${Math.round(closeProb * 100)}%` : "—"}</p>
          <p className="text-[9px] text-muted-foreground">Prob. fermeture</p>
        </div>
      </div>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground/60">
        <span>Qualité : {qualityScore ?? "—"}/100</span>
        <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3" /> {confidence ?? "—"}% confiance</span>
      </div>
    </motion.div>
  );
}
