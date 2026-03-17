/**
 * UNPRO — Alex Concierge Floating Orb
 * Compact floating bottom-right orb for QR flow integration.
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot } from "lucide-react";

interface AlexConciergeOrbProps {
  onClick: () => void;
  hasMessage?: boolean;
}

export default function AlexConciergeOrb({ onClick, hasMessage = false }: AlexConciergeOrbProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.button
      onClick={onClick}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-gradient-to-br from-primary to-secondary shadow-[var(--shadow-glow-lg)] flex items-center justify-center group"
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 20, delay: 0.8 }}
    >
      {/* Pulse ring */}
      <motion.div
        className="absolute inset-0 rounded-full bg-primary/30"
        animate={{ scale: [1, 1.6, 1.6], opacity: [0.4, 0, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
      />
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 blur-lg" />
      <Bot className="h-6 w-6 text-primary-foreground relative z-10" />

      <AnimatePresence>
        {hasMessage && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive border-2 border-background"
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="absolute right-full mr-3 bg-card/95 backdrop-blur-sm border border-border rounded-xl px-3 py-1.5 whitespace-nowrap shadow-[var(--shadow-lg)]"
          >
            <span className="text-xs font-medium text-foreground">Alex — Concierge IA</span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
