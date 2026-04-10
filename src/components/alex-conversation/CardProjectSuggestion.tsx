import { motion } from "framer-motion";
import { Lightbulb, ArrowRight } from "lucide-react";

export default function CardProjectSuggestion() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-[90%] ml-9 rounded-xl border border-accent/30 bg-accent/5 backdrop-blur-sm p-3.5"
    >
      <div className="flex items-center gap-2 mb-2">
        <Lightbulb className="w-4 h-4 text-accent" />
        <span className="text-sm font-semibold text-foreground">Suggestion de projet</span>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        Basé sur votre type de propriété, je recommande de prioriser l'isolation avant les rénovations esthétiques. 
        Économies estimées : 15-25% sur le chauffage.
      </p>
      <button className="text-xs font-medium text-accent flex items-center gap-1 hover:underline">
        Explorer cette option <ArrowRight className="w-3 h-3" />
      </button>
    </motion.div>
  );
}
