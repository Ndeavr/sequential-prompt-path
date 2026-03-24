/**
 * UNPRO — Exclusivity Opportunity Card
 */
import { motion } from "framer-motion";
import { Crown, Lock } from "lucide-react";

interface Props {
  isExclusive: boolean;
  allocationMode?: string;
  competitorCount?: number;
  tradeSlug?: string;
  citySlug?: string;
}

export default function CardExclusivityOpportunity({ isExclusive, allocationMode, competitorCount, tradeSlug, citySlug }: Props) {
  if (!isExclusive && allocationMode !== "exclusive") {
    return (
      <div className="rounded-xl border border-border/20 bg-card/40 p-3 flex items-center gap-2">
        <Lock className="h-4 w-4 text-muted-foreground" />
        <div>
          <p className="text-xs text-muted-foreground">Rendez-vous partagé</p>
          <p className="text-[10px] text-muted-foreground/60">
            {competitorCount != null ? `${competitorCount} entrepreneur(s) en compétition` : "Mode standard"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-xl border border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-primary/5 p-3 space-y-1"
    >
      <div className="flex items-center gap-2">
        <Crown className="h-4 w-4 text-violet-400" />
        <span className="text-xs font-semibold text-foreground">Exclusivité garantie</span>
      </div>
      <p className="text-[10px] text-muted-foreground leading-relaxed">
        Ce rendez-vous en <span className="text-foreground capitalize">{tradeSlug}</span> à <span className="text-foreground capitalize">{citySlug}</span> vous est réservé.
        Aucun autre entrepreneur ne le verra. Zéro compétition.
      </p>
    </motion.div>
  );
}
