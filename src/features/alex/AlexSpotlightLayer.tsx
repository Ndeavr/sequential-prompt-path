/**
 * Alex 100M — Spotlight Layer
 * Pulsing circle overlays with helper labels.
 */

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAlexStore } from "./state/alexStore";

export function AlexSpotlightLayer() {
  const spotlight = useAlexStore((s) => s.spotlight);
  const lang = useAlexStore((s) => s.activeLanguage);
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!spotlight) {
      setRect(null);
      return;
    }
    const el = document.querySelector(spotlight.targetSelector);
    if (el) {
      setRect(el.getBoundingClientRect());
    }
  }, [spotlight]);

  if (!spotlight || !rect) return null;

  const label = lang === "fr-CA" ? spotlight.labelFr : spotlight.labelEn;

  return (
    <AnimatePresence>
      <motion.div
        key="spotlight-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[90] pointer-events-none"
      >
        {/* Dim overlay */}
        <div className="absolute inset-0 bg-background/60" />

        {/* Spotlight cutout */}
        <motion.div
          className="absolute border-2 border-primary rounded-xl"
          style={{
            left: rect.left - 8,
            top: rect.top - 8,
            width: rect.width + 16,
            height: rect.height + 16,
          }}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {/* Pulse ring */}
          {spotlight.pulse && (
            <motion.div
              className="absolute inset-0 rounded-xl border border-primary/40"
              animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          )}
        </motion.div>

        {/* Label */}
        <motion.div
          className="absolute bg-card border border-border/60 rounded-lg px-3 py-1.5 text-xs text-foreground shadow-lg"
          style={{ left: rect.left, top: rect.bottom + 16 }}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {label}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
