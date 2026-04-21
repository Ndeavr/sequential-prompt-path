/**
 * Alex 100M — Voice Hook
 * Single playback. Stops if user speaks. Cleanup on unmount.
 */

import { useCallback, useEffect, useRef } from "react";
import { useAlexStore } from "../state/alexStore";
import { elevenlabsService } from "../services/elevenlabsService";
import { alexLog } from "../utils/alexDebug";

export function useAlexVoice() {
  const isMounted = useRef(true);
  const isUserSpeaking = useAlexStore((s) => s.isUserSpeaking);
  const isVoiceAvailable = useAlexStore((s) => s.isVoiceAvailable);
  const isAudioUnlocked = useAlexStore((s) => s.isAudioUnlocked);

  // Stop playback immediately when user starts speaking
  useEffect(() => {
    if (isUserSpeaking) {
      const state = useAlexStore.getState();
      if (state.hasActivePlayback) {
        elevenlabsService.stop();
        state.stopSpeaking();
        alexLog("voice:interrupted_by_user");
      }
    }
  }, [isUserSpeaking]);

  const speak = useCallback(
    async (text: string): Promise<void> => {
      if (!isVoiceAvailable || !isAudioUnlocked) {
        alexLog("voice:skip_no_audio", { isVoiceAvailable, isAudioUnlocked });
        return;
      }

      const state = useAlexStore.getState();

      // Cancel any current playback first
      if (state.hasActivePlayback) {
        elevenlabsService.stop();
        state.stopSpeaking();
      }

      try {
        state.startSpeaking();
        await elevenlabsService.speak(
          text,
          () => alexLog("voice:playback_started"),
          () => {
            if (isMounted.current) {
              useAlexStore.getState().stopSpeaking();
            }
          }
        );
      } catch {
        if (isMounted.current) {
          useAlexStore.getState().stopSpeaking();
        }
        alexLog("voice:playback_error");
      }
    },
    [isVoiceAvailable, isAudioUnlocked]
  );

  const stop = useCallback(() => {
    elevenlabsService.stop();
    useAlexStore.getState().stopSpeaking();
    alexLog("voice:manual_stop");
  }, []);

  const unlockAudio = useCallback(async () => {
    try {
      const ctx = new AudioContext();
      await ctx.resume();
      ctx.close();
      useAlexStore.getState().setAudioUnlocked(true);
      useAlexStore.getState().setAutoplayAllowed(true);
      alexLog("voice:audio_unlocked");

      // Speak greeting if not yet spoken
      const state = useAlexStore.getState();
      if (!state.isGreetingSpoken) {
        const greetingMsg = state.messages.find(
          (m) => m.role === "assistant" && !m.isSpoken
        );
        if (greetingMsg) {
          // Mark spoken handled by the welcome manager
          const { alexWelcomeManager } = await import("../services/alexWelcomeManager");
          if (alexWelcomeManager.markGreetingSpoken()) {
            await speak(greetingMsg.text);
          }
        }
      }
    } catch {
      alexLog("voice:unlock_failed");
    }
  }, [speak]);

  // Cleanup on unmount
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      elevenlabsService.stop();
    };
  }, []);

  return { speak, stop, unlockAudio };
}
