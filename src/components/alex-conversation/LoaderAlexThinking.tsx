/**
 * LoaderAlexThinking — Premium thinking indicator with contextual voice labels.
 */
import { motion } from "framer-motion";
import { Bot } from "lucide-react";

interface Props {
  label?: string;
}

export default function LoaderAlexThinking({ label }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex gap-2.5 items-center"
    >
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center border border-primary/20"
        style={{
          background: "radial-gradient(circle at 35% 35%, hsl(var(--primary) / 0.25), hsl(262 80% 50% / 0.08))",
        }}
      >
        <Bot className="w-3.5 h-3.5 text-primary" />
      </div>
      <div
        className="flex gap-1.5 items-center px-4 py-3 rounded-2xl rounded-tl-md border border-border/30"
        style={{
          background: "linear-gradient(135deg, hsl(var(--muted) / 0.5), hsl(var(--muted) / 0.3))",
          backdropFilter: "blur(12px)",
        }}
      >
        {label ? (
          <span className="text-xs text-primary font-medium animate-pulse">{label}</span>
        ) : (
          [0, 1, 2].map(i => (
            <motion.div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-primary/60"
              animate={{ opacity: [0.3, 1, 0.3], scale: [0.85, 1.15, 0.85] }}
              transition={{ duration: 1, repeat: Infinity, delay: i * 0.2, ease: "easeInOut" }}
            />
          ))
        )}
      </div>
    </motion.div>
  );
}
