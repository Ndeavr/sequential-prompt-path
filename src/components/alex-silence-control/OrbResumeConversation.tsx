/**
 * OrbResumeConversation — Shows when Alex is paused. Click to resume exactly where left off.
 * 
 * Premium glow, distinct visual state, label "Reprendre" / "Resume".
 */
import { motion } from "framer-motion";
import { Play } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  isPaused: boolean;
  onResume: () => void;
  language?: "fr" | "en";
  className?: string;
}

export default function OrbResumeConversation({ isPaused, onResume, language = "fr", className }: Props) {
  if (!isPaused) return null;

  const label = language === "fr" ? "Reprendre" : "Resume";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className={cn("flex flex-col items-center gap-3", className)}
    >
      <motion.button
        onClick={onResume}
        className="relative flex items-center justify-center"
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        aria-label={label}
      >
        {/* Soft pulsing glow */}
        <motion.div
          className="absolute h-24 w-24 rounded-full"
          style={{
            background: "radial-gradient(circle, hsl(var(--primary) / 0.15) 0%, transparent 70%)",
          }}
          animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Orb body */}
        <motion.div
          className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full border border-primary/30"
          style={{
            background: "linear-gradient(135deg, hsl(var(--primary) / 0.2), hsl(var(--primary) / 0.08))",
            boxShadow: "0 4px 20px -4px hsl(var(--primary) / 0.25)",
          }}
          animate={{ scale: [1, 1.03, 1] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <Play className="h-6 w-6 text-primary ml-0.5" />
        </motion.div>
      </motion.button>

      <span className="text-xs text-muted-foreground font-medium">{label}</span>
    </motion.div>
  );
}
