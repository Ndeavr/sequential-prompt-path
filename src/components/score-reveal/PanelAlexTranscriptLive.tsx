/**
 * PanelAlexTranscriptLive — Real-time transcript during score reveal.
 */
import { motion, AnimatePresence } from "framer-motion";
import UnproIcon from "@/components/brand/UnproIcon";

interface TranscriptLine {
  text: string;
  isHighlight?: boolean;
}

interface Props {
  lines: TranscriptLine[];
  isTyping: boolean;
}

export default function PanelAlexTranscriptLive({ lines, isTyping }: Props) {
  return (
    <div className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-4 space-y-3 max-h-48 overflow-y-auto">
      <div className="flex items-center gap-2 mb-2">
        <UnproIcon size={20} variant="primary" />
        <span className="text-xs font-semibold text-foreground">Alex</span>
      </div>

      <AnimatePresence>
        {lines.map((line, i) => (
          <motion.p
            key={i}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={`text-sm leading-relaxed ${
              line.isHighlight
                ? "font-semibold text-primary"
                : "text-foreground/70"
            }`}
          >
            {line.text}
          </motion.p>
        ))}
      </AnimatePresence>

      {isTyping && (
        <div className="flex items-center gap-1 pt-1">
          {[0, 0.15, 0.3].map((d) => (
            <motion.div
              key={d}
              className="w-1.5 h-1.5 rounded-full bg-primary/50"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 0.8, repeat: Infinity, delay: d }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
