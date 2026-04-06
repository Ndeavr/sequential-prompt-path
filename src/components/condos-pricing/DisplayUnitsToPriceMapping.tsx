import { motion } from "framer-motion";
import { EXAMPLE_UNITS, calculateCondoPrice, getPricePerUnitPerMonth } from "@/lib/condoDirectPricing";

interface Props {
  currentUnits: number;
}

export default function DisplayUnitsToPriceMapping({ currentUnits }: Props) {
  return (
    <section className="space-y-4">
      <h2 className="font-display text-lg font-semibold text-foreground text-center">
        Exemples de tarification
      </h2>
      <p className="text-sm text-muted-foreground text-center">
        Simple. Transparent. Adapté à votre immeuble.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {EXAMPLE_UNITS.map((u) => {
          const price = calculateCondoPrice(u);
          const monthly = getPricePerUnitPerMonth(u);
          const isActive = u === currentUnits;

          return (
            <motion.div
              key={u}
              whileTap={{ scale: 0.97 }}
              className={`rounded-xl p-3 text-center border transition-all ${
                isActive
                  ? "bg-primary/10 border-primary/30 ring-1 ring-primary/20"
                  : "glass-card border-border/30 hover:border-border/50"
              }`}
            >
              <p className={`text-xs font-medium ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                {u} unités
              </p>
              <p className="font-display text-base font-bold text-foreground mt-0.5">
                {price.toLocaleString("fr-CA")} $
              </p>
              <p className="text-[10px] text-muted-foreground">
                {monthly.toFixed(2)} $/u/mois
              </p>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
