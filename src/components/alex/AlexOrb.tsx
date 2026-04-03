/**
 * AlexOrb — Cinematic AI orb with signature glow, breathing pulse,
 * and organic gradient movement. Primary CTA for UNPRO.
 */
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

interface AlexOrbProps {
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
  className?: string;
}

export default function AlexOrb({ size = "lg", onClick, className = "" }: AlexOrbProps) {
  const sizeMap = {
    sm: "h-14 w-14",
    md: "h-20 w-20",
    lg: "h-28 w-28",
  };
  const iconSize = {
    sm: "h-5 w-5",
    md: "h-7 w-7",
    lg: "h-10 w-10",
  };

  return (
    <button
      onClick={onClick}
      className={`relative flex items-center justify-center group ${className}`}
      aria-label="Parler à Alex"
    >
      {/* Halo ring — slow spin */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: "145%",
          height: "145%",
          background: "conic-gradient(from 0deg, hsl(222 100% 61% / 0.10), hsl(195 100% 50% / 0.15), hsl(252 100% 65% / 0.10), hsl(222 100% 61% / 0.10))",
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
      />

      {/* Outer glow — breathing */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: "130%",
          height: "130%",
          background: "radial-gradient(circle, hsl(222 100% 61% / 0.18) 0%, transparent 70%)",
        }}
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.5, 1, 0.5],
        }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Main orb */}
      <motion.div
        className={`relative ${sizeMap[size]} rounded-full flex items-center justify-center overflow-hidden cursor-pointer`}
        style={{
          background: "linear-gradient(135deg, hsl(222 100% 55%), hsl(252 100% 60%), hsl(195 100% 48%))",
          boxShadow: `
            0 8px 36px -4px hsl(222 100% 61% / 0.4),
            0 0 24px -4px hsl(195 100% 50% / 0.25),
            inset 0 1px 1px hsl(0 0% 100% / 0.2),
            inset 0 -2px 4px hsl(222 100% 30% / 0.3)
          `,
        }}
        animate={{ scale: [1, 1.04, 1] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
        whileHover={{ scale: 1.1, boxShadow: "0 12px 48px -4px hsl(222 100% 61% / 0.55), 0 0 36px -4px hsl(195 100% 50% / 0.3)" }}
        whileTap={{ scale: 0.95 }}
      >
        {/* Internal light gradient */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background: "radial-gradient(circle at 35% 28%, hsl(0 0% 100% / 0.25), transparent 55%)",
          }}
          animate={{ opacity: [0.8, 1, 0.8] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Shine sweep */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background: "linear-gradient(120deg, transparent 30%, hsl(0 0% 100% / 0.15) 50%, transparent 70%)",
          }}
          animate={{ x: ["-100%", "100%"] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", repeatDelay: 2 }}
        />

        <Sparkles className={`relative z-10 text-white ${iconSize[size]}`} />
      </motion.div>
    </button>
  );
}
