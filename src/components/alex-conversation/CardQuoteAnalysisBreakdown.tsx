import { motion } from "framer-motion";
import { FileText, AlertTriangle, CheckCircle, ArrowRight } from "lucide-react";
import type { QuoteAnalysisData } from "./types";

interface Props {
  data: QuoteAnalysisData;
  onViewDetails?: () => void;
}

export default function CardQuoteAnalysisBreakdown({ data, onViewDetails }: Props) {
  const qualityColor = data.qualityScore >= 75 ? "text-emerald-500" : data.qualityScore >= 50 ? "text-amber-500" : "text-red-500";
  const priceLabel = data.priceComparison === "below_market" ? "Sous le marché" : data.priceComparison === "market" ? "Prix du marché" : "Au-dessus du marché";
  const priceColor = data.priceComparison === "below_market" ? "bg-emerald-500/10 text-emerald-600" : data.priceComparison === "market" ? "bg-blue-500/10 text-blue-600" : "bg-amber-500/10 text-amber-600";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm p-4 space-y-3"
    >
      <div className="flex items-center gap-2">
        <FileText className="w-4 h-4 text-primary" />
        <div className="flex-1">
          <p className="text-xs text-muted-foreground">Analyse soumission</p>
          <p className="text-sm font-semibold text-foreground">{data.supplierName}</p>
        </div>
        <div className="text-right">
          <p className={`text-lg font-bold ${qualityColor}`}>{data.qualityScore}</p>
          <p className="text-[10px] text-muted-foreground">/ 100</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-muted/50 rounded-lg p-2">
          <p className="text-muted-foreground">Montant total</p>
          <p className="font-semibold text-foreground">{data.totalAmount.toLocaleString("fr-CA")} $</p>
        </div>
        <div className="bg-muted/50 rounded-lg p-2">
          <p className="text-muted-foreground">Taxes (TPS + TVQ)</p>
          <p className="font-semibold text-foreground">{(data.taxGst + data.taxQst).toLocaleString("fr-CA", { minimumFractionDigits: 2 })} $</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${priceColor}`}>
          {priceLabel}
        </span>
        <span className="text-[10px] text-muted-foreground">{data.itemCount} postes analysés</span>
      </div>

      {data.anomalies.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-amber-600 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Anomalies détectées
          </p>
          {data.anomalies.map((a, i) => (
            <p key={i} className="text-xs text-foreground/70 pl-4">• {a}</p>
          ))}
        </div>
      )}

      <div className="flex items-start gap-2 text-xs bg-primary/5 rounded-lg p-2.5">
        <CheckCircle className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
        <p className="text-foreground/80">{data.verdict}</p>
      </div>

      {onViewDetails && (
        <button
          onClick={onViewDetails}
          className="w-full flex items-center justify-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
        >
          Détails complets <ArrowRight className="w-3 h-3" />
        </button>
      )}
    </motion.div>
  );
}
