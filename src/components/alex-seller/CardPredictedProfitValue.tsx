/**
 * UNPRO — Predicted Profit Value Card
 */
import { motion } from "framer-motion";
import { TrendingUp, ShieldCheck } from "lucide-react";

interface Props {
  profitValue?: number;
  contractValue?: number;
  dynamicPriceCents?: number;
  riskLevel?: string;
}

const fmt = (v: number) =>
  new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(v);

const riskColor: Record<string, string> = {
  low: "text-emerald-400",
  medium: "text-yellow-400",
  high: "text-red-400",
};

export default function CardPredictedProfitValue({ profitValue, contractValue, dynamicPriceCents, riskLevel }: Props) {
  const roi = dynamicPriceCents && profitValue
    ? Math.round((profitValue / (dynamicPriceCents / 100)) * 100) / 100
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border/20 bg-card/50 p-3 space-y-2"
    >
      <div className="flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-emerald-400" />
        <span className="text-xs font-semibold text-foreground">Profit prédit</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-lg font-bold text-emerald-400">{profitValue ? fmt(profitValue) : "—"}</p>
          <p className="text-[9px] text-muted-foreground">Profit net estimé</p>
        </div>
        <div>
          <p className="text-lg font-bold text-foreground">{roi ? `${roi}x` : "—"}</p>
          <p className="text-[9px] text-muted-foreground">ROI sur rendez-vous</p>
        </div>
      </div>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground/60">
        {dynamicPriceCents && (
          <span>Coût RDV : {fmt(dynamicPriceCents / 100)}</span>
        )}
        {riskLevel && (
          <span className={`flex items-center gap-1 ${riskColor[riskLevel] || "text-muted-foreground"}`}>
            <ShieldCheck className="h-3 w-3" /> Risque {riskLevel === "low" ? "faible" : riskLevel === "medium" ? "moyen" : "élevé"}
          </span>
        )}
      </div>
    </motion.div>
  );
}
