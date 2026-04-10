import { motion } from "framer-motion";
import { SearchX } from "lucide-react";

export default function CardNoMatchFallback() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-[90%] ml-9 rounded-xl border border-border/60 bg-card/80 backdrop-blur-sm p-3.5"
    >
      <div className="flex items-center gap-2 mb-2">
        <SearchX className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-semibold text-foreground">Aucun entrepreneur disponible</span>
      </div>
      <p className="text-xs text-muted-foreground">
        Je n'ai pas trouvé de professionnel correspondant dans votre secteur pour le moment. 
        Je peux vous alerter dès qu'un expert devient disponible.
      </p>
    </motion.div>
  );
}
