/**
 * WidgetLeadCostEstimator — Compares traditional lead acquisition costs vs UNPRO.
 */
import { motion } from "framer-motion";
import { DollarSign, TrendingDown, AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  city?: string;
  category?: string;
  avgCPC?: number;
  conversionRate?: number;
  appointmentsNeeded?: number;
  unproPlanPrice?: number;
  className?: string;
}

export default function WidgetLeadCostEstimator({
  city = "Montréal",
  category = "Plomberie",
  avgCPC = 12.50,
  conversionRate = 3.2,
  appointmentsNeeded = 8,
  unproPlanPrice = 99,
  className,
}: Props) {
  const clicksPerLead = Math.ceil(100 / conversionRate);
  const costPerLead = avgCPC * clicksPerLead;
  const traditionalMonthly = Math.round(costPerLead * appointmentsNeeded);
  const savings = Math.max(0, traditionalMonthly - unproPlanPrice);
  const savingsPct = traditionalMonthly > 0 ? Math.round((savings / traditionalMonthly) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("glass-card rounded-2xl p-5 space-y-4", className)}
    >
      <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
        <DollarSign className="w-4 h-4 text-primary" />
        Coût d'acquisition — {category}, {city}
      </h3>

      {/* Traditional */}
      <div className="rounded-xl bg-destructive/5 border border-destructive/15 p-4 space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-destructive">
          <AlertTriangle className="w-3.5 h-3.5" />
          Google Ads traditionnel
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-sm font-bold text-foreground">{avgCPC.toFixed(2)} $</div>
            <div className="text-[10px] text-muted-foreground">CPC moyen</div>
          </div>
          <div>
            <div className="text-sm font-bold text-foreground">{conversionRate}%</div>
            <div className="text-[10px] text-muted-foreground">Conversion</div>
          </div>
          <div>
            <div className="text-sm font-bold text-destructive">{traditionalMonthly} $</div>
            <div className="text-[10px] text-muted-foreground">/mois</div>
          </div>
        </div>
      </div>

      {/* UNPRO */}
      <div className="rounded-xl bg-green-500/5 border border-green-500/15 p-4 space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-green-500">
          <CheckCircle2 className="w-3.5 h-3.5" />
          UNPRO — Rendez-vous garantis
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-sm font-bold text-foreground">{appointmentsNeeded}</div>
            <div className="text-[10px] text-muted-foreground">RDV inclus</div>
          </div>
          <div>
            <div className="text-sm font-bold text-foreground">100%</div>
            <div className="text-[10px] text-muted-foreground">Qualifiés</div>
          </div>
          <div>
            <div className="text-sm font-bold text-green-500">{unproPlanPrice} $</div>
            <div className="text-[10px] text-muted-foreground">/mois</div>
          </div>
        </div>
      </div>

      {/* Savings */}
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.3 }}
        className="rounded-xl bg-gradient-to-r from-primary/10 to-accent/10 p-3 text-center"
      >
        <TrendingDown className="w-5 h-5 text-primary mx-auto mb-1" />
        <div className="text-lg font-bold text-foreground">
          Économisez {savings} $/mois
        </div>
        <div className="text-[11px] text-muted-foreground">
          soit {savingsPct}% de moins qu'avec Google Ads
        </div>
      </motion.div>
    </motion.div>
  );
}
