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
import { elevenlabsService } from "@/features/alex/services/elevenlabsService";

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

import type { AlexIntent } from "@/services/alexOpeningTemplates";

interface AlexVoiceContextType {
  isOpen: boolean;
  feature: string;
  voiceActive: boolean;
  openAlex: (feature?: string, contextHint?: string, displayMode?: "fullscreen" | "floating", intent?: AlexIntent) => void;
  closeAlex: () => void;
}


const AlexVoiceContext = createContext<AlexVoiceContextType>({
  isOpen: false,
  feature: "general",
  voiceActive: false,
  openAlex: () => {},
  closeAlex: () => {},
});

/** Features that should open Alex as a compact floating glass panel instead of a full-screen takeover. */
const FLOATING_FEATURE_PREFIXES = ["home_", "intent_", "capability_", "discovery_"];

function defaultDisplayModeFor(feature: string): "fullscreen" | "floating" {
  const f = (feature || "").toLowerCase();
  return FLOATING_FEATURE_PREFIXES.some((p) => f.startsWith(p)) ? "floating" : "fullscreen";
}

export function AlexVoiceProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [feature, setFeature] = useState("general");
  const [voiceActive, setVoiceActive] = useState(false);

  const openAlex = useCallback((feat = "general", contextHint?: string, displayMode?: "fullscreen" | "floating") => {
    const lockedStore = useAlexVoiceLockedStore.getState();

    if (lockedStore.isOverlayOpen) {
      console.warn("[AlexVoiceContext] Locked voice session active — ignoring openAlex");
      return;
    }

    // Prime mobile playback synchronously from the user tap before any async boot.
    elevenlabsService.unlockPlayback();

    const resolvedMode = displayMode ?? defaultDisplayModeFor(feat);

    // Open the overlay synchronously (UX), then lazy-kill any other audio.
    lockedStore.openVoiceSession(feat, "user_openAlex", contextHint, resolvedMode);
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