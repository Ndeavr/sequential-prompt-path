/**
 * CardRevenueProjectionInline — Revenue projection card in Alex chat
 */
import { motion } from "framer-motion";
import { TrendingUp, DollarSign, Target } from "lucide-react";
import type { PlanDefinition } from "@/services/alexPlanTruthEngine";
import { projectRevenue } from "@/services/alexPlanTruthEngine";

interface Props {
  plan: PlanDefinition;
  avgContractValue?: number;
  closeRate?: number;
}

export default function CardRevenueProjectionInline({ plan, avgContractValue = 5000, closeRate = 0.35 }: Props) {
  const { monthlyRevenue, yearlyRevenue, roi } = projectRevenue(plan, avgContractValue, closeRate);
  const conversions = Math.round(plan.appointmentsIncluded * closeRate);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 backdrop-blur-sm"
    >
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="w-4 h-4 text-emerald-400" />
        <h4 className="text-sm font-semibold text-foreground">Projection — {plan.name}</h4>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="text-center">
          <Target className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
          <p className="text-lg font-bold text-foreground">{conversions}</p>
          <p className="text-[10px] text-muted-foreground">Contrats/mois</p>
        </div>
        <div className="text-center">
          <DollarSign className="w-4 h-4 mx-auto mb-1 text-emerald-400" />
          <p className="text-lg font-bold text-emerald-400">{(monthlyRevenue / 1000).toFixed(0)}k$</p>
          <p className="text-[10px] text-muted-foreground">Revenu/mois</p>
        </div>
        <div className="text-center">
          <TrendingUp className="w-4 h-4 mx-auto mb-1 text-primary" />
          <p className="text-lg font-bold text-primary">{roi}%</p>
          <p className="text-[10px] text-muted-foreground">ROI</p>
        </div>
      </div>

      <p className="text-xs text-muted-foreground mt-3 text-center">
        Basé sur {plan.appointmentsIncluded} RDV exclusifs · Valeur moy. {(avgContractValue / 1000).toFixed(0)}k$ · Taux closing {(closeRate * 100).toFixed(0)}%
      </p>
    </motion.div>
  );
}
