// PROTECTED FILE — ALEX VOICE CORE
// Do not modify unless task explicitly says VOICE.
// Any change requires voice_smoke_test passing before deploy.
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
import { useAlexVoiceLockedStore } from "@/stores/alexVoiceLockedStore";

// Heavy audio modules are dynamically imported on first user interaction
// to keep them out of the main entry chunk (was ~80 KB of audio code).
async function killAllAudioSources() {
  const [{ alexAudioChannel }, { audioEngine }] = await Promise.all([
    import("@/services/alexSingleAudioChannel"),
    import("@/services/audioEngineUNPRO"),
  ]);
  alexAudioChannel.hardStop();
  audioEngine.unlock();
  return { alexAudioChannel };
}

interface AlexVoiceContextType {
  isOpen: boolean;
  feature: string;
  voiceActive: boolean;
  openAlex: (feature?: string, contextHint?: string) => void;
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

  const openAlex = useCallback((feat = "general", contextHint?: string) => {
    const lockedStore = useAlexVoiceLockedStore.getState();

    if (lockedStore.isOverlayOpen) {
      console.warn("[AlexVoiceContext] Locked voice session active — ignoring openAlex");
      return;
    }

    // Open the overlay synchronously (UX), then lazy-kill any other audio.
    lockedStore.openVoiceSession(feat, "user_openAlex", contextHint);
    setFeature(feat);
    void killAllAudioSources().catch(() => {});
  }, []);

  const closeAlex = useCallback(() => {
    const lockedStore = useAlexVoiceLockedStore.getState();
    if (lockedStore.isOverlayOpen) {
      lockedStore.closeVoiceSession("user_closeAlex");
    }
    window.dispatchEvent(new CustomEvent("alex-voice-cleanup"));
    setIsOpen(false);
    setVoiceActive(false);
    void killAllAudioSources().catch(() => {});
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