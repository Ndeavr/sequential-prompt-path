/**
 * UnproStickyPromoBar — Premium sticky bottom promo bar.
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function UnproStickyPromoBar() {
  const [visible, setVisible] = useState(true);
  const navigate = useNavigate();

  if (!visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ delay: 2, duration: 0.5 }}
        className="fixed bottom-0 left-0 right-0 z-40 px-3 pb-3 md:pb-4 pointer-events-none"
      >
        <div className="max-w-lg mx-auto pointer-events-auto">
          <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl"
            style={{ background: "linear-gradient(135deg, hsl(222 100% 20%), hsl(252 80% 25%), hsl(222 100% 30%))" }}
          >
            <button
              onClick={() => setVisible(false)}
              className="absolute top-2 right-2 h-6 w-6 rounded-full bg-white/10 flex items-center justify-center text-white/50 hover:text-white/80 transition-colors"
              aria-label="Fermer"
            >
              <X className="h-3.5 w-3.5" />
            </button>

            <div className="flex items-center gap-3 p-3 pr-10">
              <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                <Sparkles className="h-5 w-5 text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-white leading-tight">Accès pionnier UnPRO</p>
                <p className="text-[11px] text-white/60 leading-tight mt-0.5">Avantage permanent avant le lancement officiel</p>
              </div>
              <button
                onClick={() => navigate("/entrepreneur")}
                className="shrink-0 h-8 px-4 rounded-full bg-white/15 hover:bg-white/25 text-white text-xs font-bold flex items-center gap-1 transition-colors"
              >
                Voir
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
