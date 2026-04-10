/**
 * AlexVoiceContext — Global context to trigger Alex voice/orb from anywhere.
 * 
 * UPDATED: openAlex() now opens the locked full-screen voice overlay via Zustand store.
 * The old inline overlay (GlobalAlexOverlay/AlexVoiceMode) is kept as fallback for text.
 * 
 * RULE: Opening Alex always fires cleanup to kill ALL other voice sources first,
 * EXCEPT if the locked overlay is already active.
 */
import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { alexAudioChannel } from "@/services/alexSingleAudioChannel";
import { useAlexVoiceLockedStore } from "@/stores/alexVoiceLockedStore";
import { audioEngine } from "@/services/audioEngineUNPRO";

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
    // Use the locked voice overlay instead of the old inline mode
    const lockedStore = useAlexVoiceLockedStore.getState();
    
    // If locked overlay is already open, don't interfere
    if (lockedStore.isOverlayOpen) {
      console.warn("[AlexVoiceContext] Locked voice session active — ignoring openAlex");
      return;
    }

    // Kill ALL audio and voice sources before opening
    alexAudioChannel.hardStop();
    audioEngine.unlock();
    // NOTE: Do NOT dispatch alex-voice-cleanup here — it causes the race condition
    // that kills the session we're about to start
    
    // Open the locked full-screen voice overlay
    lockedStore.openVoiceSession(feat, "user_openAlex");
    
    setFeature(feat);
    setIsOpen(true);
    setVoiceActive(true);
  }, []);

  const closeAlex = useCallback(() => {
    const lockedStore = useAlexVoiceLockedStore.getState();
    
    // Close locked overlay if open
    if (lockedStore.isOverlayOpen) {
      lockedStore.closeVoiceSession("user_closeAlex");
    }

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
