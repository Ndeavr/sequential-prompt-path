/**
 * GlobalAlexOverlay — Rendered once at app root.
 * When triggered via useAlexVoice().openAlex(), immediately starts voice mode.
 * Uses AlexSingleAudioChannel for guaranteed single-voice output.
 * 
 * RULE: On open, fires cleanup to kill Realtime sessions.
 * On close, fires cleanup again.
 */
import { useAlexVoice } from "@/contexts/AlexVoiceContext";
import AlexVoiceMode from "./AlexVoiceMode";
import { useCallback, useEffect } from "react";
import { alexAudioChannel } from "@/services/alexSingleAudioChannel";

export default function GlobalAlexOverlay() {
  const { isOpen, feature, closeAlex } = useAlexVoice();

  const handleDismiss = useCallback(() => {
    alexAudioChannel.hardStop();
    window.dispatchEvent(new CustomEvent("alex-voice-cleanup"));
    closeAlex();
  }, [closeAlex]);

  const handleFlowComplete = useCallback((_ctx: Record<string, string>) => {
    alexAudioChannel.hardStop();
    window.dispatchEvent(new CustomEvent("alex-voice-cleanup"));
    closeAlex();
  }, [closeAlex]);

  // Ensure audio stops when overlay closes
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
