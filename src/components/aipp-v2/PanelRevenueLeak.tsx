import { TrendingDown } from "lucide-react";
import { motion } from "framer-motion";

interface Props {
  revenueLoss: number;
}

export default function PanelRevenueLeak({ revenueLoss }: Props) {
  return (
    <div className="bg-card border border-red-500/20 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <TrendingDown className="w-5 h-5 text-red-400" />
        <h3 className="text-sm font-semibold text-foreground">Revenu potentiel perdu</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-2">
        Estimation mensuelle basée sur vos lacunes de visibilité IA.
      </p>
      <motion.p
        className="text-3xl font-bold text-red-400"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.3 }}
      >
        {revenueLoss.toLocaleString("fr-CA")} $/mois
      </motion.p>
      <p className="text-[11px] text-muted-foreground mt-1">
        Basé sur les opportunités manquées en visibilité IA, conversion et présence locale.
      </p>
    </div>
  );
}
