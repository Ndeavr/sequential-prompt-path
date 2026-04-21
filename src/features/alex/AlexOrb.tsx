/**
 * Alex 100M — Orb
 * Pure visual state indicator + tap interaction entry.
 */

import { motion } from "framer-motion";
import { useAlexStore } from "./state/alexStore";
import type { AlexMode } from "./types/alex.types";

const MODE_STYLES: Record<string, { ring: string; bg: string; scale: number; pulse: boolean }> = {
  booting:      { ring: "border-muted-foreground/30", bg: "bg-muted/50",    scale: 0.9,  pulse: false },
  ready:        { ring: "border-primary/60",          bg: "bg-primary/10",  scale: 1,    pulse: true },
  speaking:     { ring: "border-primary",             bg: "bg-primary/20",  scale: 1.05, pulse: false },
  listening:    { ring: "border-accent",              bg: "bg-accent/15",   scale: 1.08, pulse: false },
  thinking:     { ring: "border-secondary/70",        bg: "bg-secondary/10",scale: 1,    pulse: true },
  waiting_for_reply: { ring: "border-primary/40",     bg: "bg-primary/5",   scale: 1,    pulse: true },
  soft_prompt_visible: { ring: "border-primary/40",   bg: "bg-primary/5",   scale: 1,    pulse: true },
  noise_detected:     { ring: "border-warning/60",    bg: "bg-warning/10",  scale: 1,    pulse: false },
  low_confidence_audio: { ring: "border-warning/40",  bg: "bg-warning/5",   scale: 1,    pulse: false },
  guiding_ui:   { ring: "border-accent",              bg: "bg-accent/10",   scale: 1.02, pulse: false },
  analyzing_image: { ring: "border-secondary",        bg: "bg-secondary/15",scale: 1,    pulse: true },
  showing_options: { ring: "border-primary/50",       bg: "bg-primary/8",   scale: 1,    pulse: false },
  closing_due_to_inactivity: { ring: "border-muted-foreground/20", bg: "bg-muted/30", scale: 0.92, pulse: false },
  minimized:    { ring: "border-muted-foreground/20", bg: "bg-muted/20",    scale: 0.85, pulse: false },
  fallback_text:{ ring: "border-primary/30",          bg: "bg-primary/5",   scale: 1,    pulse: false },
  error:        { ring: "border-destructive/60",      bg: "bg-destructive/10", scale: 1, pulse: false },
};

interface AlexOrbProps {
  onTap?: () => void;
  size?: "sm" | "md" | "lg";
}

export function AlexOrb({ onTap, size = "md" }: AlexOrbProps) {
  const mode = useAlexStore((s) => s.mode);
  const style = MODE_STYLES[mode] ?? MODE_STYLES.ready;

  const sizeMap = { sm: "w-12 h-12", md: "w-16 h-16", lg: "w-20 h-20" };

  return (
    <motion.button
      onClick={onTap}
      className={`relative rounded-full border-2 ${style.ring} ${style.bg} ${sizeMap[size]} flex items-center justify-center cursor-pointer transition-colors duration-300`}
      animate={{ scale: style.scale }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      whileTap={{ scale: 0.95 }}
      aria-label="Alex AI assistant"
    >
      {/* Inner glow */}
      <div className="absolute inset-2 rounded-full bg-gradient-to-br from-primary/20 to-secondary/10" />

      {/* Center icon */}
      <span className="relative text-lg font-bold text-primary z-10">A</span>

      {/* Pulse ring for applicable modes */}
      {style.pulse && (
        <motion.div
          className={`absolute inset-0 rounded-full border ${style.ring}`}
          animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      {/* Speaking wave effect */}
      {mode === "speaking" && (
        <>
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="absolute inset-0 rounded-full border border-primary/30"
              animate={{ scale: [1, 1.5 + i * 0.2], opacity: [0.4, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3, ease: "easeOut" }}
            />
          ))}
        </>
      )}

      {/* Listening reactive ring */}
      {mode === "listening" && (
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-accent/50"
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
    </motion.button>
  );
}
