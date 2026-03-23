/**
 * AlexSuggestionBanner — Lightweight proactive suggestion banner.
 * Used by Reality Engine for non-intrusive nudges.
 */
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, ChevronRight } from "lucide-react";

interface AlexSuggestionBannerProps {
  text: string;
  onAct?: () => void;
  onDismiss?: () => void;
  visible?: boolean;
}

export default function AlexSuggestionBanner({ text, onAct, onDismiss, visible = true }: AlexSuggestionBannerProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="mx-4 mt-2 rounded-2xl border border-primary/15 bg-primary/5 backdrop-blur-sm px-4 py-3 flex items-center gap-3"
        >
          <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
          </div>
          <p className="text-xs text-foreground flex-1 leading-relaxed">{text}</p>
          <div className="flex items-center gap-1 shrink-0">
            {onAct && (
              <button onClick={onAct} className="rounded-full bg-primary/10 hover:bg-primary/20 p-1.5 transition-colors">
                <ChevronRight className="h-3.5 w-3.5 text-primary" />
              </button>
            )}
            {onDismiss && (
              <button onClick={onDismiss} className="rounded-full hover:bg-muted p-1.5 transition-colors">
                <X className="h-3 w-3 text-muted-foreground" />
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
