/**
 * Alex 100M — Assistant Shell
 * Orchestrates Orb + Panel + Spotlight. Minimized/active states.
 */

import { motion, AnimatePresence } from "framer-motion";
import { useAlexStore } from "./state/alexStore";
import { useAlexVoice } from "./hooks/useAlexVoice";
import { AlexOrb } from "./AlexOrb";
import { AlexPanel } from "./AlexPanel";
import { AlexSpotlightLayer } from "./AlexSpotlightLayer";
import { AlexDebugPanel } from "./AlexDebugPanel";

export function AlexAssistant() {
  const mode = useAlexStore((s) => s.mode);
  const isAutoplayAllowed = useAlexStore((s) => s.isAutoplayAllowed);
  const lang = useAlexStore((s) => s.activeLanguage);
  const { unlockAudio } = useAlexVoice();

  const isMinimized = mode === "minimized";
  const isClosing = mode === "closing_due_to_inactivity";

  const handleOrbTap = () => {
    if (isMinimized || isClosing) {
      useAlexStore.getState().restoreAssistant();
      useAlexStore.getState().markUserEngaged();
      useAlexStore.getState().resetNoResponse();
      useAlexStore.getState().resetAutoReprompt();
      return;
    }
    if (!isAutoplayAllowed) {
      unlockAudio();
      return;
    }
  };

  return (
    <>
      <AlexSpotlightLayer />

      <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end gap-3">
        <AnimatePresence mode="wait">
          {!isMinimized && !isClosing && (
            <motion.div
              key="panel"
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.25 }}
            >
              <AlexPanel />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Minimized label */}
        {isMinimized && (
          <motion.div
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-card/80 backdrop-blur-sm border border-border/30 rounded-full px-3 py-1 text-[11px] text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
            onClick={handleOrbTap}
          >
            {lang === "fr-CA" ? "Reprendre avec Alex" : "Resume with Alex"}
          </motion.div>
        )}

        {/* Tap to start when autoplay blocked */}
        {!isMinimized && !isAutoplayAllowed && mode === "ready" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-[10px] text-primary/60 text-right"
          >
            {lang === "fr-CA" ? "Touchez pour activer la voix" : "Tap to enable voice"}
          </motion.div>
        )}

        <AlexOrb onTap={handleOrbTap} size="md" />
      </div>

      <AlexDebugPanel />
    </>
  );
}
