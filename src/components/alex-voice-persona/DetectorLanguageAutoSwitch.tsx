/**
 * DetectorLanguageAutoSwitch — Visual indicator for language detection.
 */
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  currentLanguage: "fr" | "en";
  isDetecting?: boolean;
}

export default function DetectorLanguageAutoSwitch({ currentLanguage, isDetecting }: Props) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={currentLanguage}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-muted/40 border border-border/20"
      >
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
          {currentLanguage === "fr" ? "🇨🇦 FR" : "🇬🇧 EN"}
        </span>
        {isDetecting && (
          <motion.div
            className="w-1.5 h-1.5 rounded-full bg-primary"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 0.6, repeat: Infinity }}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
}
