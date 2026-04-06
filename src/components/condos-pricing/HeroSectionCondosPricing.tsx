import { motion } from "framer-motion";
import { Building2 } from "lucide-react";

export default function HeroSectionCondosPricing() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="text-center space-y-4 pt-6"
    >
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold">
        <Building2 className="w-3.5 h-3.5" />
        Tarification Condos
      </div>
      <h1 className="font-display text-2xl sm:text-3xl font-bold leading-tight text-foreground">
        Votre immeuble. Votre prix.{" "}
        <span className="text-primary">Instantanément.</span>
      </h1>
      <p className="text-muted-foreground text-sm sm:text-base max-w-md mx-auto leading-relaxed">
        Entrez le nombre d'unités. On s'occupe du reste.
      </p>
    </motion.section>
  );
}
