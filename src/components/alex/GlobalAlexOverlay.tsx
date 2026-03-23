/**
 * GlobalAlexOverlay — Rendered once at app root.
 * When triggered via useAlexVoice().openAlex(), immediately starts voice mode.
 */
import { useAlexVoice } from "@/contexts/AlexVoiceContext";
import AlexVoiceMode from "./AlexVoiceMode";
import { useCallback } from "react";

export default function GlobalAlexOverlay() {
  const { isOpen, feature, closeAlex } = useAlexVoice();

  const handleDismiss = useCallback(() => {
    closeAlex();
  }, [closeAlex]);

  const handleFlowComplete = useCallback((_ctx: Record<string, string>) => {
    closeAlex();
  }, [closeAlex]);

  if (!isOpen) return null;

  return (
    <AlexVoiceMode
      feature={feature}
      onFlowComplete={handleFlowComplete}
      onDismiss={handleDismiss}
    />
  );
}
