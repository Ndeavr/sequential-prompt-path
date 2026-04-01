/**
 * AdaptiveInputModeController — Voice-first input with intelligent fallback.
 * Priority: Voice → Chat → Form (fallback only).
 */
import { useInputModeDetection, type InputMode } from "@/hooks/useInputModeDetection";
import OrbAlexVoicePrimary from "./OrbAlexVoicePrimary";
import ChatAlexSecondary from "./ChatAlexSecondary";
import FormProjectFallbackAdaptive from "./FormProjectFallbackAdaptive";
import BannerSwitchInputMode from "./BannerSwitchInputMode";
import PanelInputModeSelector from "./PanelInputModeSelector";
import { AnimatePresence, motion } from "framer-motion";
import { useAlexVoice } from "@/contexts/AlexVoiceContext";
import { useCallback, useState } from "react";

interface Props {
  feature?: string;
  onProjectSubmit?: (data: Record<string, string>) => void;
  prefillData?: Record<string, string>;
}

export default function AdaptiveInputModeController({
  feature = "general",
  onProjectSubmit,
  prefillData,
}: Props) {
  const {
    activeMode,
    voiceAvailable,
    voiceChecked,
    resistanceDetected,
    chatFailed,
    switchMode,
    registerVoiceDismiss,
    registerChatFailure,
    fallbackToForm,
    logModeUsage,
  } = useInputModeDetection();

  const { openAlex } = useAlexVoice();
  const [showModeSelector, setShowModeSelector] = useState(false);
  const [alexContext, setAlexContext] = useState<Record<string, string>>(prefillData || {});

  const handleVoiceActivate = useCallback(() => {
    logModeUsage("voice", true);
    openAlex(feature);
  }, [openAlex, feature, logModeUsage]);

  const handleVoiceDismiss = useCallback(() => {
    registerVoiceDismiss();
    logModeUsage("voice", false);
  }, [registerVoiceDismiss, logModeUsage]);

  const handleChatMessage = useCallback(
    (msg: string) => {
      setAlexContext((prev) => ({ ...prev, lastMessage: msg }));
    },
    []
  );

  const handleChatFailure = useCallback(() => {
    registerChatFailure("user_abandon");
    logModeUsage("chat", false);
  }, [registerChatFailure, logModeUsage]);

  const handleFormSubmit = useCallback(
    (data: Record<string, string>) => {
      logModeUsage("form", true, true);
      onProjectSubmit?.(data);
    },
    [logModeUsage, onProjectSubmit]
  );

  const handleModeSelect = useCallback(
    (mode: InputMode) => {
      switchMode(mode);
      setShowModeSelector(false);
      if (mode === "voice") handleVoiceActivate();
    },
    [switchMode, handleVoiceActivate]
  );

  // Loading state while checking voice
  if (!voiceChecked) {
    return (
      <div className="flex items-center justify-center py-20">
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="h-16 w-16 rounded-full bg-gradient-to-br from-primary via-secondary to-accent"
        />
      </div>
    );
  }

  return (
    <div className="relative space-y-4">
      {/* Fallback banner suggestions */}
      <AnimatePresence>
        {activeMode === "chat" && resistanceDetected && (
          <BannerSwitchInputMode
            currentMode="chat"
            message="Vous préférez écrire ? Pas de problème."
            onSwitch={() => switchMode("chat")}
          />
        )}
        {activeMode === "form" && chatFailed && (
          <BannerSwitchInputMode
            currentMode="form"
            message="On peut aussi remplir ça rapidement ensemble."
            onSwitch={() => switchMode("form")}
          />
        )}
      </AnimatePresence>

      {/* Active mode */}
      <AnimatePresence mode="wait">
        {activeMode === "voice" && (
          <motion.div
            key="voice"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
          >
            <OrbAlexVoicePrimary
              voiceAvailable={voiceAvailable}
              onActivate={handleVoiceActivate}
              onDismiss={handleVoiceDismiss}
              onSwitchToChat={() => switchMode("chat")}
            />
          </motion.div>
        )}

        {activeMode === "chat" && (
          <motion.div
            key="chat"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <ChatAlexSecondary
              feature={feature}
              onMessage={handleChatMessage}
              onFailure={handleChatFailure}
              onSwitchToForm={fallbackToForm}
            />
          </motion.div>
        )}

        {activeMode === "form" && (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ duration: 0.3 }}
          >
            <FormProjectFallbackAdaptive
              prefillData={alexContext}
              onSubmit={handleFormSubmit}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mode selector toggle */}
      <div className="flex justify-center pt-2">
        <button
          onClick={() => setShowModeSelector(!showModeSelector)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Changer le mode d'interaction
        </button>
      </div>

      <AnimatePresence>
        {showModeSelector && (
          <PanelInputModeSelector
            activeMode={activeMode}
            voiceAvailable={voiceAvailable}
            onSelect={handleModeSelect}
            onClose={() => setShowModeSelector(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
