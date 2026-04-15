/**
 * PanelAlexRealtimeAssist — Contextual Alex nudge that adapts to the selected pain.
 */
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle } from "lucide-react";
import { type PainOption } from "@/hooks/useAdaptiveSession";
import UnproIcon from "@/components/brand/UnproIcon";

interface Props {
  selectedPain: PainOption | null;
  onTalk: () => void;
}

const DEFAULT_MSG = "Décrivez votre situation. Je m'occupe du reste.";

function getMessage(pain: PainOption | null): string {
  if (!pain) return DEFAULT_MSG;
  return `Je comprends — "${pain.label}". Laissez-moi vous aider immédiatement.`;
}

export default function PanelAlexRealtimeAssist({ selectedPain, onTalk }: Props) {
  const msg = getMessage(selectedPain);

  return (
    <section className="px-5 py-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.35 }}
        className="max-w-md mx-auto rounded-2xl border border-primary/20 bg-primary/[0.03] backdrop-blur-sm p-4 flex items-start gap-3"
      >
        <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
          <UnproIcon size={24} variant="blue" />
        </div>
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.p
              key={msg}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-sm text-foreground/80 mb-2"
            >
              {msg}
            </motion.p>
          </AnimatePresence>
          <button
            onClick={onTalk}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            Parler à Alex
          </button>
        </div>
      </motion.div>
    </section>
  );
}
