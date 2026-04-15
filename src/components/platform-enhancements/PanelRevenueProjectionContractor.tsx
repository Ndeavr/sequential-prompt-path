/**
 * PanelRevenueProjectionContractor — "Revenue lost without UNPRO" calculator.
 */
import { motion } from "framer-motion";
import { TrendingUp, DollarSign, AlertTriangle } from "lucide-react";

interface Props {
  closingRate?: number;
  capacity?: number;
  avgJobValue?: number;
}

export default function PanelRevenueProjectionContractor({
  closingRate = 0.35,
  capacity = 8,
  avgJobValue = 4500,
}: Props) {
  const monthlyLeadsWithout = 3;
  const monthlyLeadsWith = capacity;
  const revenueWithout = Math.round(monthlyLeadsWithout * closingRate * avgJobValue);
  const revenueWith = Math.round(monthlyLeadsWith * closingRate * avgJobValue);
  const lost = revenueWith - revenueWithout;

  return (
    <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Projection de revenus</h3>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-xl bg-muted/40 p-3 text-center">
          <p className="text-[10px] text-muted-foreground mb-1">Sans UNPRO</p>
          <p className="text-lg font-bold text-foreground">{revenueWithout.toLocaleString("fr-CA")} $</p>
          <p className="text-[10px] text-muted-foreground">/mois</p>
        </div>
        <div className="rounded-xl bg-primary/10 border border-primary/20 p-3 text-center">
          <p className="text-[10px] text-primary mb-1">Avec UNPRO</p>
          <p className="text-lg font-bold text-primary">{revenueWith.toLocaleString("fr-CA")} $</p>
          <p className="text-[10px] text-primary/70">/mois</p>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20"
      >
        <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
        <div>
          <p className="text-xs font-semibold text-red-400">
            {lost.toLocaleString("fr-CA")} $ perdus chaque mois
          </p>
          <p className="text-[10px] text-red-400/70">
            Basé sur {capacity} leads/mois, taux de fermeture {Math.round(closingRate * 100)}%
          </p>
        </div>
      </motion.div>
    </div>
  );
}
