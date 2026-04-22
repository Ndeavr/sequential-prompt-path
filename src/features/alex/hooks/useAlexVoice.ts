/**
 * Alex 100M — Voice Hook V6
 * Voice is enhancement only. All failures degrade to text/chat.
 * speakGreetingNow() — speaks pending greeting immediately after unlock.
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

  /**
   * V6: speakGreetingNow — consumes pendingGreetingText immediately.
   * Does NOT require mic/STT. Does NOT wait for user speech.
   */
  const speakGreetingNow = useCallback(async () => {
    const state = useAlexStore.getState();
    const greeting = state.pendingGreetingText;

    if (!greeting) {
      // Fallback: find first assistant message
      const firstMsg = state.messages.find((m) => m.role === "assistant");
      if (!firstMsg) {
        alexLog("voice:speakGreetingNow:no_greeting_found");
        return;
      }
      await speak(firstMsg.text);
      useAlexStore.setState({
        isGreetingSpoken: true,
        shouldSpeakGreetingOnUnlock: false,
        audioUnlockRequired: false,
      });
      return;
    }

    alexLog("voice:speakGreetingNow", { greeting: greeting.slice(0, 60) });

    // Stop any current playback
    if (state.hasActivePlayback) {
      elevenlabsService.stop();
      state.stopSpeaking();
    }

    try {
      state.startSpeaking();
      await elevenlabsService.speak(
        greeting,
        () => alexLog("voice:greeting_playback_started"),
        () => {
          if (isMounted.current) {
            useAlexStore.getState().stopSpeaking();
          }
        }
      );
      useAlexStore.setState({
        isGreetingSpoken: true,
        pendingGreetingText: null,
        shouldSpeakGreetingOnUnlock: false,
        audioUnlockRequired: false,
      });
      alexLog("voice:greeting_spoken_success");
    } catch (error) {
      if (isMounted.current) {
        useAlexStore.getState().stopSpeaking();
        useAlexStore.setState({ mode: "ready" });
      }
      alexLog("voice:greeting_speak_error", error);
    }
  }, [speak]);

  /**
   * V6: unlockAudio — unlock AudioContext + immediately speak greeting.
   * First tap → unlock → speak. Not "unlock → listen → wait".
   */
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

      useAlexStore.setState({
        isAudioUnlocked: true,
        isAutoplayAllowed: true,
        audioUnlockRequired: false,
        mode: "ready",
      });
      alexLog("voice:audio_unlocked");

      // V6: Speak greeting immediately after unlock — no mic wait
      await speakGreetingNow();
    } catch (error) {
      useAlexStore.setState({ isAutoplayAllowed: false, mode: "ready" });
      useAlexStore.getState().stopSpeaking();
      alexLog("voice:unlock_failed", error);
    }
  }, [speakGreetingNow]);

  // Cleanup on unmount
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      elevenlabsService.stop();
    };
  }, []);

  return { speak, stop, unlockAudio, speakGreetingNow };
}
