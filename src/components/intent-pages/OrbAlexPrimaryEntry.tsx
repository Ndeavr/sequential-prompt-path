/**
 * OrbAlexPrimaryEntry — Central Alex Orb for intent home pages.
 * States: idle (breathing), listening, speaking, processing.
 */
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useAlexVoice } from "@/contexts/AlexVoiceContext";
import { cn } from "@/lib/utils";

interface Props {
  intentFeature?: string;
  contextHint?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = { sm: "h-16 w-16", md: "h-20 w-20", lg: "h-24 w-24" };
const iconMap = { sm: "h-6 w-6", md: "h-7 w-7", lg: "h-9 w-9" };
const haloMap = { sm: "140%", md: "145%", lg: "150%" };

export default function OrbAlexPrimaryEntry({
  intentFeature = "general",
  contextHint,
  size = "lg",
  className,
}: Props) {
  const { openAlex } = useAlexVoice();

  return (
    <button
      onClick={() => openAlex(intentFeature, contextHint)}
      className={cn("relative flex items-center justify-center group", className)}
      aria-label="Parler à Alex"
    >
      {/* Halo ring — slow spin */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: haloMap[size],
          height: haloMap[size],
          background:
            "conic-gradient(from 0deg, hsl(222 100% 61% / 0.08), hsl(195 100% 50% / 0.12), hsl(252 100% 65% / 0.08), hsl(222 100% 61% / 0.08))",
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
      />

      {/* Breathing glow */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: "130%",
          height: "130%",
          background: "radial-gradient(circle, hsl(222 100% 61% / 0.15) 0%, transparent 70%)",
        }}
        animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.9, 0.4] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Main orb */}
      <motion.div
        className={cn(
          "relative rounded-full flex items-center justify-center overflow-hidden cursor-pointer",
          sizeMap[size]
        )}
        style={{
          background: "linear-gradient(135deg, hsl(222 100% 55%), hsl(252 100% 60%), hsl(195 100% 48%))",
          boxShadow:
            "0 8px 32px -4px hsl(222 100% 61% / 0.35), 0 0 20px -4px hsl(195 100% 50% / 0.2), inset 0 1px 1px hsl(0 0% 100% / 0.2)",
        }}
        animate={{ scale: [1, 1.04, 1] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
        whileHover={{
          scale: 1.1,
          boxShadow: "0 12px 48px -4px hsl(222 100% 61% / 0.5), 0 0 32px -4px hsl(195 100% 50% / 0.3)",
        }}
        whileTap={{ scale: 0.95 }}
      >
        {/* Internal shine */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background: "radial-gradient(circle at 35% 28%, hsl(0 0% 100% / 0.22), transparent 55%)",
          }}
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />

        <Sparkles className={cn("relative z-10 text-white", iconMap[size])} />
      </motion.div>
    </button>
  );
}
