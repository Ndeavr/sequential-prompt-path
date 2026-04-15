import { motion } from "framer-motion";
import { FlaskConical } from "lucide-react";

export default function HeroSectionOperationalSimulation() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="py-6 px-4"
    >
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-xl bg-primary/10">
          <FlaskConical className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground font-display">Simulation opérationnelle</h1>
          <p className="text-sm text-muted-foreground">Validez le funnel complet extract → paiement → activation</p>
        </div>
      </div>
    </motion.section>
  );
}
