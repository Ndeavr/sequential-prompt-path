/**
 * Alex 100M — Assistant Shell V6
 * Orb tap priority: restore → unlock+speak → normal.
 * Single CTA when audio unlock needed. Never asks user to speak first.
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
  const lang = useAlexStore((s) => s.activeLanguage);
  const audioUnlockRequired = useAlexStore((s) => s.audioUnlockRequired);
  const shouldSpeakGreetingOnUnlock = useAlexStore((s) => s.shouldSpeakGreetingOnUnlock);
  const { unlockAudio } = useAlexVoice();

  const isMinimized = mode === "minimized";
  const isClosing = mode === "closing_due_to_inactivity";

  const handleOrbTap = () => {
    // Priority 1: Restore from minimized
    if (isMinimized || isClosing) {
      useAlexStore.getState().restoreAssistant();
      useAlexStore.getState().markUserEngaged();
      useAlexStore.getState().resetNoResponse();
      useAlexStore.getState().resetAutoReprompt();

      // If greeting still pending, unlock + speak on restore
      if (shouldSpeakGreetingOnUnlock || audioUnlockRequired) {
        unlockAudio();
      }
      return;
    }

    // Priority 2: Audio unlock needed → unlock + speak greeting immediately
    if (audioUnlockRequired || shouldSpeakGreetingOnUnlock) {
      unlockAudio();
      return;
    }

    // Priority 3: Normal — no special action on orb tap when already active
  };

  return (
    <>
      <AlexSpotlightLayer />

      <div className="fixed bottom-4 right-4 z-[100] flex w-[min(calc(100vw-2rem),28rem)] flex-col items-end gap-3 sm:bottom-6 sm:right-6">
        <AnimatePresence mode="wait">
          {!isMinimized && !isClosing && (
            <motion.div
              key="panel"
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.25 }}
              className="w-full"
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

        {/* V6: Single CTA when audio unlock needed — no duplicate prompts */}
        {!isMinimized && (audioUnlockRequired || shouldSpeakGreetingOnUnlock) && mode === "ready" && (
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={handleOrbTap}
            className="text-right text-[11px] font-medium text-primary/70 transition-colors hover:text-primary"
          >
            {lang === "fr-CA" ? "Touchez pour démarrer Alex." : "Tap to start Alex."}
          </motion.button>
        )}

        <AlexOrb onTap={handleOrbTap} size="md" />
      </div>

      <AlexDebugPanel />
    </>
  );
}
