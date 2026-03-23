/**
 * GlobalAlexOverlay — Rendered once at app root.
 * When triggered via useAlexVoice().openAlex(), shows the orb + voice overlay.
 */
import { useAlexVoice } from "@/contexts/AlexVoiceContext";
import AlexOverlay from "./AlexOverlay";
import AlexVoiceMode from "./AlexVoiceMode";
import { useState, useCallback } from "react";
import type { AlexAction } from "./AlexOverlay";

type Phase = "greeting" | "voice" | "idle";

export default function GlobalAlexOverlay() {
  const { isOpen, feature, closeAlex } = useAlexVoice();
  const [phase, setPhase] = useState<Phase>("greeting");

  // Reset to greeting when opening
  const currentPhase = isOpen ? phase : "idle";

  const handleStartVoice = useCallback(() => {
    setPhase("voice");
  }, []);

  const handleDismiss = useCallback(() => {
    setPhase("greeting");
    closeAlex();
  }, [closeAlex]);

  const handleFlowComplete = useCallback((_ctx: Record<string, string>) => {
    setPhase("greeting");
    closeAlex();
  }, [closeAlex]);

  if (!isOpen) return null;

  const greetingActions: AlexAction[] = [
    { label: "🎙️ Parler", onClick: handleStartVoice },
    { label: "Fermer", onClick: handleDismiss, variant: "outline" as const },
  ];

  return (
    <>
      <AlexOverlay
        isOpen={currentPhase === "greeting"}
        onClose={handleDismiss}
        message="Bonjour! Je suis Alex, votre conseiller IA. Comment puis-je vous aider?"
        subMessage="Parlez-moi de votre projet • Diagnostic gratuit"
        actions={greetingActions}
      />

      {currentPhase === "voice" && (
        <AlexVoiceMode
          feature={feature}
          onFlowComplete={handleFlowComplete}
          onDismiss={handleDismiss}
        />
      )}
    </>
  );
}
