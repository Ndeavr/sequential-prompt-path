/**
 * GlobalAlexOverlay — Rendered once at app root.
 * When triggered via useAlexVoice().openAlex(), starts voice mode.
 * Uses AlexSingleAudioChannel for guaranteed single-voice output.
 * 
 * SINGLETON GUARD: Checks alexRuntime lock before opening.
 * If Hero already holds the lock on home page, overlay defers.
 */
import { useAlexVoice } from "@/contexts/AlexVoiceContext";
import AlexVoiceMode from "./AlexVoiceMode";
import { useCallback, useEffect } from "react";
import { alexAudioChannel } from "@/services/alexSingleAudioChannel";
import { alexRuntime } from "@/services/alexRuntimeSingleton";

const COMPONENT_NAME = 'GlobalAlexOverlay';

export default function GlobalAlexOverlay() {
  const { isOpen, feature, closeAlex } = useAlexVoice();

  // Register as passive — never primary (Hero owns primary on home)
  useEffect(() => {
    if (isOpen) {
      alexRuntime.registerSource(COMPONENT_NAME, 'passive');
    }
    return () => {
      alexRuntime.unregisterSource(COMPONENT_NAME);
    };
  }, [isOpen]);

  const handleDismiss = useCallback(() => {
    alexAudioChannel.hardStop();
    window.dispatchEvent(new CustomEvent("alex-voice-cleanup"));
    alexRuntime.releaseLock(COMPONENT_NAME);
    closeAlex();
  }, [closeAlex]);

  const handleFlowComplete = useCallback((_ctx: Record<string, string>) => {
    alexAudioChannel.hardStop();
    window.dispatchEvent(new CustomEvent("alex-voice-cleanup"));
    alexRuntime.releaseLock(COMPONENT_NAME);
    closeAlex();
  }, [closeAlex]);

  // Ensure audio stops when overlay closes
  useEffect(() => {
    if (!isOpen) {
      alexAudioChannel.hardStop();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // If another Alex instance already holds the lock, don't render voice mode
  const lockOwner = alexRuntime.getLockOwner();
  if (lockOwner && lockOwner !== COMPONENT_NAME) {
    console.warn(`[GlobalAlexOverlay] Blocked — lock held by ${lockOwner}`);
    return null;
  }

  return (
    <AlexVoiceMode
      feature={feature}
      onFlowComplete={handleFlowComplete}
      onDismiss={handleDismiss}
    />
  );
}
