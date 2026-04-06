import { motion, AnimatePresence } from "framer-motion";
import { calculateCondoPrice, getPricePerUnit, getPricePerUnitPerMonth, getDynamicBadge } from "@/lib/condoDirectPricing";
import BadgePricePerUnit from "./BadgePricePerUnit";

interface Props {
  units: number;
}

export default function CardPricingResultCondos({ units }: Props) {
  const total = calculateCondoPrice(units);
  const perUnit = getPricePerUnit(units);
  const perUnitMonth = getPricePerUnitPerMonth(units);
  const badge = getDynamicBadge(units);

  return (
    <div className="glass-card rounded-2xl p-6 border border-primary/20 text-center space-y-4 relative overflow-hidden">
      {/* Subtle glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.06] to-transparent pointer-events-none" />

      <div className="relative z-10 space-y-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={total}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="space-y-1"
          >
            <p className="text-sm text-muted-foreground">
              {units} unité{units > 1 ? "s" : ""}
            </p>
            <p className="font-display text-4xl sm:text-5xl font-bold text-foreground">
              {total.toLocaleString("fr-CA")} $
              <span className="text-base font-medium text-muted-foreground ml-1">/ an</span>
            </p>
          </motion.div>
        </AnimatePresence>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-sm text-muted-foreground">
          <span>{perUnit.toFixed(2)} $ / unité / an</span>
          <span className="hidden sm:inline">·</span>
          <span>{perUnitMonth.toFixed(2)} $ / unité / mois</span>
        </div>

        <BadgePricePerUnit label={badge} />
      </div>
    </div>
  );
}
