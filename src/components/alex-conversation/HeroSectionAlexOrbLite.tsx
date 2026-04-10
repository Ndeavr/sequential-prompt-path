import { motion } from "framer-motion";

interface Props {
  isListening: boolean;
  isSpeaking: boolean;
  isThinking: boolean;
}

export default function HeroSectionAlexOrbLite({ isListening, isSpeaking, isThinking }: Props) {
  const pulseScale = isSpeaking ? [1, 1.15, 1] : isListening ? [1, 1.08, 1] : [1, 1.03, 1];
  const glowOpacity = isSpeaking ? 0.5 : isListening ? 0.35 : 0.15;

  return (
    <div className="flex flex-col items-center pt-12 pb-6">
      <div className="relative">
        {/* Outer glow */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            width: 88,
            height: 88,
            background: `radial-gradient(circle, hsl(var(--primary) / ${glowOpacity}) 0%, transparent 70%)`,
            filter: "blur(20px)",
          }}
          animate={{ scale: pulseScale, opacity: [0.6, 1, 0.6] }}
          transition={{ duration: isSpeaking ? 0.8 : 2, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Core orb */}
        <motion.div
          className="relative w-16 h-16 rounded-full border border-primary/30 flex items-center justify-center"
          style={{
            background: "radial-gradient(circle at 35% 35%, hsl(var(--primary) / 0.25), hsl(var(--primary) / 0.08))",
            boxShadow: `0 0 32px -8px hsl(var(--primary) / 0.3)`,
          }}
          animate={{
            scale: isThinking ? [1, 0.95, 1] : 1,
            borderColor: isSpeaking
              ? ["hsl(var(--primary) / 0.3)", "hsl(var(--primary) / 0.6)", "hsl(var(--primary) / 0.3)"]
              : undefined,
          }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <span className="text-lg font-display font-bold text-primary select-none">A</span>
        </motion.div>
      </div>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-xs text-muted-foreground mt-3 font-medium"
      >
        {isSpeaking ? "Alex parle..." : isListening ? "Je vous écoute" : isThinking ? "Un instant..." : "Alex · Assistant UNPRO"}
      </motion.p>
    </div>
  );
}
