import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, Sparkles } from "lucide-react";

interface Props {
  delta: number;
  visible: boolean;
}

export default function AippDeltaPreview({ delta, visible }: Props) {
  if (!visible || delta === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed top-20 right-4 z-50"
        initial={{ opacity: 0, y: -20, scale: 0.8 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.8 }}
        transition={{ type: "spring", damping: 15 }}
      >
        <div className="bg-success text-success-foreground px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          <span className="font-bold text-sm">+{delta} points AIPP</span>
          <TrendingUp className="h-4 w-4" />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
