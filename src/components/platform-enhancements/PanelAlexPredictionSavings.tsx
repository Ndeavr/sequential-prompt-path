/**
 * PanelAlexPredictionSavings — Estimated savings + errors avoided.
 */
import { motion } from "framer-motion";
import { Sparkles, ShieldCheck, DollarSign } from "lucide-react";

interface Props {
  estimatedSavings?: number;
  errorsAvoided?: number;
  analysisCount?: number;
}

export default function PanelAlexPredictionSavings({
  estimatedSavings = 3200,
  errorsAvoided = 4,
  analysisCount = 12,
}: Props) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Économies estimées par Alex</h3>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl bg-green-500/10 border border-green-500/20 p-3 text-center"
        >
          <DollarSign className="w-4 h-4 text-green-400 mx-auto mb-1" />
          <p className="text-lg font-bold text-green-400">{estimatedSavings.toLocaleString("fr-CA")} $</p>
          <p className="text-[9px] text-green-400/70">Économisé</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-3 text-center"
        >
          <ShieldCheck className="w-4 h-4 text-blue-400 mx-auto mb-1" />
          <p className="text-lg font-bold text-blue-400">{errorsAvoided}</p>
          <p className="text-[9px] text-blue-400/70">Erreurs évitées</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-xl bg-purple-500/10 border border-purple-500/20 p-3 text-center"
        >
          <Sparkles className="w-4 h-4 text-purple-400 mx-auto mb-1" />
          <p className="text-lg font-bold text-purple-400">{analysisCount}</p>
          <p className="text-[9px] text-purple-400/70">Analyses IA</p>
        </motion.div>
      </div>
    </div>
  );
}
