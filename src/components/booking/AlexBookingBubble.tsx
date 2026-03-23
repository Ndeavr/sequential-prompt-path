/**
 * Floating Alex help bubble for booking pages.
 * Appears as a small pulsing orb that expands on tap.
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Sparkles } from "lucide-react";
import { useAlexVoice } from "@/contexts/AlexVoiceContext";

interface AlexBookingBubbleProps {
  contextHint?: string;
}

export function AlexBookingBubble({ contextHint }: AlexBookingBubbleProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-4 z-50 md:hidden">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="absolute bottom-14 right-0 w-72 rounded-2xl bg-card border border-border/60 shadow-xl p-4 space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-meta font-semibold text-foreground">Alex</span>
              </div>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-caption text-muted-foreground leading-relaxed">
              {contextHint || "Besoin d'aide pour choisir? Je peux vous guider vers la meilleure option pour votre situation."}
            </p>
            <a
              href="/alex"
              className="block text-center text-caption font-medium text-primary hover:underline"
            >
              Parler à Alex →
            </a>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={() => setOpen(!open)}
        className="w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        animate={open ? {} : { boxShadow: ["0 0 0 0 hsl(var(--primary) / 0.3)", "0 0 0 8px hsl(var(--primary) / 0)", "0 0 0 0 hsl(var(--primary) / 0.3)"] }}
        transition={open ? {} : { duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
      >
        {open ? <X className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />}
      </motion.button>
    </div>
  );
}
