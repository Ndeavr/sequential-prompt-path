/**
 * AlexVoiceContext — Global context to trigger Alex voice/orb from anywhere.
 * Any "Parler avec Alex" button calls openAlex() to show the orb overlay.
 * 
 * RULE: Opening Alex always fires cleanup to kill ALL other voice sources first.
 * Only ONE voice source can ever be active.
 */
import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { alexAudioChannel } from "@/services/alexSingleAudioChannel";

interface AlexVoiceContextType {
  isOpen: boolean;
  feature: string;
  voiceActive: boolean;
  openAlex: (feature?: string) => void;
  closeAlex: () => void;
}

const AlexVoiceContext = createContext<AlexVoiceContextType>({
  isOpen: false,
  feature: "general",
  voiceActive: false,
  openAlex: () => {},
  closeAlex: () => {},
});

export function AlexVoiceProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [feature, setFeature] = useState("general");
  const [voiceActive, setVoiceActive] = useState(false);

  const openAlex = useCallback((feat = "general") => {
    // Kill ALL audio and voice sources before opening
    alexAudioChannel.hardStop();
    window.dispatchEvent(new CustomEvent("alex-voice-cleanup"));
    setFeature(feat);
    setIsOpen(true);
    setVoiceActive(true);
  }, []);

  const closeAlex = useCallback(() => {
    // Kill ALL audio and voice sources
    alexAudioChannel.hardStop();
    window.dispatchEvent(new CustomEvent("alex-voice-cleanup"));
    setIsOpen(false);
    setVoiceActive(false);
  }, []);

  return (
    <AlexVoiceContext.Provider value={{ isOpen, feature, voiceActive, openAlex, closeAlex }}>
      {children}
    </AlexVoiceContext.Provider>
  );
}

export function useAlexVoice() {
  return useContext(AlexVoiceContext);
}
