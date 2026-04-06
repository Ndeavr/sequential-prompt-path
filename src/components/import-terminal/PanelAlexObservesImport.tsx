/**
 * PanelAlexObservesImport — Alex's contextual messages during import.
 */
import { motion, AnimatePresence } from "framer-motion";
import { Bot } from "lucide-react";

interface Props {
  messages: string[];
}

export default function PanelAlexObservesImport({ messages }: Props) {
  const lastMessage = messages[messages.length - 1];
  if (!lastMessage) return null;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={lastMessage}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -5 }}
        transition={{ duration: 0.4 }}
        className="flex items-start gap-3 px-4 py-3 rounded-xl border border-emerald-500/10"
        style={{ background: "hsl(160 20% 5% / 0.8)" }}
      >
        <div className="w-7 h-7 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0 mt-0.5">
          <Bot className="w-4 h-4 text-emerald-400" />
        </div>
        <div>
          <p className="text-[10px] font-mono text-emerald-500/50 mb-0.5">ALEX</p>
          <p className="text-sm text-foreground/85 leading-snug">{lastMessage}</p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
