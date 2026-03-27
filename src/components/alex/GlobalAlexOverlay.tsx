/**
 * GlobalAlexOverlay — Rendered once at app root.
 * When triggered via useAlexVoice().openAlex(), immediately starts voice mode.
 * Uses AlexSingleAudioChannel for guaranteed single-voice output.
 */
import { useAlexVoice } from "@/contexts/AlexVoiceContext";
import AlexVoiceMode from "./AlexVoiceMode";
import { useCallback, useEffect } from "react";
import { alexAudioChannel } from "@/services/alexSingleAudioChannel";

export default function GlobalAlexOverlay() {
  const { isOpen, feature, closeAlex } = useAlexVoice();

  // Kill all audio when overlay closes
  const handleDismiss = useCallback(() => {
    alexAudioChannel.hardStop();
    closeAlex();
  }, [closeAlex]);

  const handleFlowComplete = useCallback((_ctx: Record<string, string>) => {
    alexAudioChannel.hardStop();
    closeAlex();
  }, [closeAlex]);

  // Ensure audio stops when overlay unmounts
  useEffect(() => {
    if (!isOpen) {
      alexAudioChannel.hardStop();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <AlexVoiceMode
      feature={feature}
      onFlowComplete={handleFlowComplete}
      onDismiss={handleDismiss}
    />
  );
}
