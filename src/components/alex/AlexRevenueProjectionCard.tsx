import { DollarSign, TrendingUp, Calendar } from "lucide-react";
import { motion } from "framer-motion";
import type { RevenueProjection } from "@/services/alexEntrepreneurGuidanceEngine";

interface Props {
  projection: RevenueProjection;
}

export function AlexRevenueProjectionCard({ projection }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-card p-5 space-y-4"
    >
      <div className="flex items-center gap-2 text-primary font-semibold text-sm">
        <TrendingUp className="w-4 h-4" />
        Projection de revenus
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-muted/50 p-3 text-center">
          <DollarSign className="w-5 h-5 mx-auto text-primary mb-1" />
          <div className="text-lg font-bold text-foreground">
            {projection.annualTarget.toLocaleString("fr-CA")}$
          </div>
          <div className="text-xs text-muted-foreground">Objectif annuel</div>
        </div>

        <div className="rounded-xl bg-muted/50 p-3 text-center">
          <Calendar className="w-5 h-5 mx-auto text-primary mb-1" />
          <div className="text-lg font-bold text-foreground">
            {projection.rdvNeededAnnual}
          </div>
          <div className="text-xs text-muted-foreground">Rendez-vous nécessaires</div>
        </div>
      </div>

      <div className="rounded-xl bg-primary/10 p-3 text-center">
        <div className="text-2xl font-bold text-primary">
          ≈ {projection.rdvNeededMonthly} / mois
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          À {projection.avgProjectValue.toLocaleString("fr-CA")}$ en moyenne par projet
        </div>
      </div>

      <div className="text-xs text-muted-foreground text-center">
        Plan recommandé : <span className="font-semibold text-foreground capitalize">{projection.recommendedPlan}</span>
      </div>
    </motion.div>
  );
}
