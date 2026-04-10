import { motion } from "framer-motion";
import { Bot } from "lucide-react";

export default function LoaderAlexThinking() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex gap-2.5 items-center"
    >
      <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
        <Bot className="w-3.5 h-3.5 text-primary" />
      </div>
      <div className="flex gap-1 px-3 py-2.5">
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60"
            animate={{ opacity: [0.3, 1, 0.3], scale: [0.85, 1.1, 0.85] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
      </div>
    </motion.div>
  );
}
