/**
 * AlexVoiceContext — Global context to trigger Alex voice/orb from anywhere.
 * Any "Parler avec Alex" button calls openAlex() to show the orb overlay.
 */
import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface AlexVoiceContextType {
  isOpen: boolean;
  feature: string;
  openAlex: (feature?: string) => void;
  closeAlex: () => void;
}

const AlexVoiceContext = createContext<AlexVoiceContextType>({
  isOpen: false,
  feature: "general",
  openAlex: () => {},
  closeAlex: () => {},
});

export function AlexVoiceProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [feature, setFeature] = useState("general");

  const openAlex = useCallback((feat = "general") => {
    setFeature(feat);
    setIsOpen(true);
  }, []);

  const closeAlex = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <AlexVoiceContext.Provider value={{ isOpen, feature, openAlex, closeAlex }}>
      {children}
    </AlexVoiceContext.Provider>
  );
}

export function useAlexVoice() {
  return useContext(AlexVoiceContext);
}
