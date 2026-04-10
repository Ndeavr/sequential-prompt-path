import { motion } from "framer-motion";
import { AlertTriangle, Phone } from "lucide-react";

export default function CardUrgencyAction() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-[90%] ml-9 rounded-xl border border-destructive/40 bg-destructive/5 backdrop-blur-sm p-3.5"
    >
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="w-4 h-4 text-destructive" />
        <span className="text-sm font-semibold text-foreground">Urgence détectée</span>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        Je vous connecte immédiatement avec un professionnel disponible aujourd'hui.
      </p>
      <button className="w-full text-xs font-semibold py-2.5 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors flex items-center justify-center gap-1.5">
        <Phone className="w-3.5 h-3.5" /> Appel prioritaire
      </button>
    </motion.div>
  );
}
