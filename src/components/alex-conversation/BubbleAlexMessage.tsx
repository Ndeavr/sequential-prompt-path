/**
 * BubbleAlexMessage — Premium Alex message bubble with glow.
 */
import { motion } from "framer-motion";
import { Bot } from "lucide-react";

interface Props {
  content: string;
}

export default function BubbleAlexMessage({ content }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="flex gap-2.5 items-start max-w-[88%]"
    >
      <div
        className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-0.5 border border-primary/20"
        style={{
          background: "radial-gradient(circle at 35% 35%, hsl(var(--primary) / 0.25), hsl(262 80% 50% / 0.08))",
        }}
      >
        <Bot className="w-3.5 h-3.5 text-primary" />
      </div>
      <div
        className="rounded-2xl rounded-tl-md border border-border/30 px-4 py-3"
        style={{
          background: "linear-gradient(135deg, hsl(var(--muted) / 0.7), hsl(var(--muted) / 0.4))",
          backdropFilter: "blur(12px)",
        }}
      >
        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{content}</p>
      </div>
    </motion.div>
  );
}
