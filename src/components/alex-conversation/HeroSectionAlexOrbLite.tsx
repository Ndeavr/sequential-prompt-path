/**
 * HeroSectionAlexOrbLite — Compact header orb.
 * Minimal height to maximize chat space.
 */
import { motion } from "framer-motion";
import { Bot } from "lucide-react";

interface Props {
  isListening: boolean;
  isSpeaking: boolean;
  isThinking: boolean;
}

export default function HeroSectionAlexOrbLite({ isListening, isSpeaking, isThinking }: Props) {
  const statusText = isSpeaking
    ? "Alex parle..."
    : isListening
    ? "Je vous écoute"
    : isThinking
    ? "Un instant..."
    : "Alex · UNPRO";

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border/20 bg-card/50 backdrop-blur-sm">
      {/* Compact orb */}
      <div className="relative">
        <motion.div
          className="w-9 h-9 rounded-full flex items-center justify-center border border-primary/30"
          style={{
            background: "radial-gradient(circle at 35% 35%, hsl(var(--primary) / 0.25), hsl(var(--primary) / 0.08))",
          }}
          animate={{
            scale: isThinking ? [1, 0.95, 1] : isSpeaking ? [1, 1.05, 1] : 1,
            boxShadow: isSpeaking
              ? ["0 0 12px hsl(var(--primary) / 0.2)", "0 0 20px hsl(var(--primary) / 0.4)", "0 0 12px hsl(var(--primary) / 0.2)"]
              : "0 0 12px hsl(var(--primary) / 0.15)",
          }}
          transition={{ duration: 1.2, repeat: Infinity }}
        >
          <Bot className="w-4 h-4 text-primary" />
        </motion.div>
        {(isListening || isSpeaking) && (
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-background" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <h1 className="text-sm font-semibold text-foreground font-display">Alex</h1>
        <motion.p
          key={statusText}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-[11px] text-muted-foreground truncate"
        >
          {statusText}
        </motion.p>
      </div>
    </div>
  );
}
