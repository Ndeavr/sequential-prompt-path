/**
 * useAudioEngine — React hook for UNPRO Sonic Identity.
 * Provides play/stop/mute + reactive state.
 */
import { useState, useEffect, useCallback } from "react";
import { audioEngine, type SoundEvent } from "@/services/audioEngineUNPRO";

export function useAudioEngine() {
  const [enabled, setEnabled] = useState(audioEngine.isEnabled());
  const [volume, setVolumeState] = useState(audioEngine.getVolume());
  const [focusMode, setFocusModeState] = useState(audioEngine.isFocusMode());

  // Unlock on first interaction
  useEffect(() => {
    const handler = () => { audioEngine.unlock(); };
    window.addEventListener("click", handler, { once: true });
    window.addEventListener("touchstart", handler, { once: true });
    return () => {
      window.removeEventListener("click", handler);
      window.removeEventListener("touchstart", handler);
    };
  }, []);

  const play = useCallback((event: SoundEvent) => {
    audioEngine.play(event);
  }, []);

  const stopAll = useCallback(() => { audioEngine.stopAll(); }, []);

  const toggleSound = useCallback(() => {
    if (audioEngine.isEnabled()) {
      audioEngine.mute();
      setEnabled(false);
    } else {
      audioEngine.unmute();
      setEnabled(true);
    }
    audioEngine.savePrefs();
  }, []);

  const setVolume = useCallback((v: number) => {
    audioEngine.setVolume(v);
    setVolumeState(v);
    audioEngine.savePrefs();
  }, []);

  const setFocusMode = useCallback((on: boolean) => {
    audioEngine.setFocusMode(on);
    setFocusModeState(on);
    audioEngine.savePrefs();
  }, []);

  return { play, stopAll, toggleSound, enabled, volume, setVolume, focusMode, setFocusMode };
}
