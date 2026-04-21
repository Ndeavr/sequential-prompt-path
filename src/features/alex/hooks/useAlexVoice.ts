/**
 * Alex 100M — Voice Hook
 * Voice is enhancement only. All failures degrade to live text/chat UI.
 */

import { useCallback, useEffect, useRef } from "react";
import { useAlexStore } from "../state/alexStore";
import { elevenlabsService } from "../services/elevenlabsService";
import { alexLog } from "../utils/alexDebug";

export function useAlexVoice() {
  const isMounted = useRef(true);
  const isUserSpeaking = useAlexStore((s) => s.isUserSpeaking);

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

  const speak = useCallback(async (text: string): Promise<void> => {
    const state = useAlexStore.getState();

    if (!state.isVoiceAvailable || !state.isAudioUnlocked) {
      alexLog("voice:skip_no_audio", {
        isVoiceAvailable: state.isVoiceAvailable,
        isAudioUnlocked: state.isAudioUnlocked,
      });
      return;
    }

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
    } catch (error) {
      if (isMounted.current) {
        useAlexStore.getState().stopSpeaking();
        useAlexStore.setState({ isAutoplayAllowed: false, mode: "ready" });
      }
      alexLog("voice:playback_error", error);
    }
  }, []);

  const stop = useCallback(() => {
    elevenlabsService.stop();
    useAlexStore.getState().stopSpeaking();
    alexLog("voice:manual_stop");
  }, []);

  const unlockAudio = useCallback(async () => {
    try {
      elevenlabsService.init();
      useAlexStore.setState({ isVoiceAvailable: elevenlabsService.isReady() });

      const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioContextCtor) {
        const ctx = new AudioContextCtor();
        await ctx.resume();
        await ctx.close();
      }

      useAlexStore.getState().setAudioUnlocked(true);
      useAlexStore.getState().setAutoplayAllowed(true);
      useAlexStore.getState().setMode("ready");
      alexLog("voice:audio_unlocked");

      // Speak greeting if not yet spoken
      const state = useAlexStore.getState();
      if (!state.isGreetingSpoken) {
        const greetingMsg = state.messages.find((m) => m.role === "assistant");
        if (greetingMsg) {
          useAlexStore.setState({ isGreetingSpoken: true });
          await speak(greetingMsg.text);
        }
      }
    } catch (error) {
      useAlexStore.setState({ isAutoplayAllowed: false, mode: "ready" });
      useAlexStore.getState().stopSpeaking();
      alexLog("voice:unlock_failed", error);
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
