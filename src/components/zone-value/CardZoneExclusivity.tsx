/**
 * UNPRO — Zone Exclusivity Opportunity Card
 */
import { motion } from "framer-motion";
import { Crown, DollarSign, TrendingUp, Lock } from "lucide-react";
import { formatCentsCAD } from "@/lib/zoneValueScoring";

interface Props {
  eligible: boolean;
  premiumCents: number;
  revenueProjectionCents: number;
  citySlug: string;
  tradeSlug: string;
  status?: string;
}

export default function CardZoneExclusivity({ eligible, premiumCents, revenueProjectionCents, citySlug, tradeSlug, status }: Props) {
  if (!eligible) {
    return (
      <div className="rounded-xl border border-border/20 bg-card/40 p-3 flex items-center gap-2">
        <Lock className="h-4 w-4 text-muted-foreground" />
        <p className="text-xs text-muted-foreground">Zone non éligible à l'exclusivité</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-xl border border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-primary/5 p-4 space-y-3"
    >
      <div className="flex items-center gap-2">
        <Crown className="h-4 w-4 text-violet-400" />
        <span className="text-xs font-semibold text-foreground">Exclusivité disponible</span>
        {status === "claimed" && (
          <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[9px] font-semibold">Réservée</span>
        )}
      </div>
      <p className="text-[10px] text-muted-foreground leading-relaxed">
        <span className="text-foreground capitalize">{tradeSlug}</span> à <span className="text-foreground capitalize">{citySlug}</span> — forte valeur, faible compétition.
      </p>
      <div className="grid grid-cols-2 gap-2">
        <div className="flex items-center gap-1.5">
          <DollarSign className="h-3.5 w-3.5 text-primary" />
          <div>
            <p className="text-sm font-bold text-foreground">{formatCentsCAD(premiumCents)}</p>
            <p className="text-[9px] text-muted-foreground">Prix premium/mois</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
          <div>
            <p className="text-sm font-bold text-foreground">{formatCentsCAD(revenueProjectionCents)}</p>
            <p className="text-[9px] text-muted-foreground">Revenu projeté/mois</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
