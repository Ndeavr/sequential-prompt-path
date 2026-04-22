/**
 * Alex 100M — Voice Hook V7
 * - connecting_voice mode before audio starts
 * - startSpeaking only on real audio playback
 * - No browser speech fallback — ever
 * - Voice ID locked
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
    if (state.hasActivePlayback || state.hasActiveTTSRequest) {
      elevenlabsService.stop();
      state.stopSpeaking();
    }

    try {
      // V7: Set connecting_voice first — not speaking
      state.startConnectingVoice();
      alexLog("voice:GREETING_AUDIO_CONNECTING");

      await elevenlabsService.speak(
        text,
        // onStart — fires only after audio.play() resolved
        () => {
          if (isMounted.current) {
            useAlexStore.getState().startSpeaking();
            alexLog("voice:GREETING_AUDIO_STARTED");
          }
        },
        // onEnd
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
      // V7: NEVER fallback to browser speech
      alexLog("voice:GREETING_AUDIO_FAILED", error);
      alexLog("voice:BROWSER_VOICE_FALLBACK_BLOCKED");
    }
  }, []);

  const stop = useCallback(() => {
    elevenlabsService.stop();
    useAlexStore.getState().stopSpeaking();
    alexLog("voice:manual_stop");
  }, []);

  /**
   * V6/V7: speakGreetingNow — consumes pendingGreetingText immediately.
   * Does NOT require mic/STT. Does NOT wait for user speech.
   */
  const speakGreetingNow = useCallback(async () => {
    const state = useAlexStore.getState();
    const greeting = state.pendingGreetingText;

    if (!greeting) {
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
    if (state.hasActivePlayback || state.hasActiveTTSRequest) {
      elevenlabsService.stop();
      state.stopSpeaking();
    }

    try {
      // V7: connecting_voice first, speaking only on real playback
      state.startConnectingVoice();
      alexLog("voice:GREETING_AUDIO_CONNECTING");

      await elevenlabsService.speak(
        greeting,
        () => {
          if (isMounted.current) {
            useAlexStore.getState().startSpeaking();
            alexLog("voice:GREETING_AUDIO_STARTED");
          }
        },
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
      alexLog("voice:GREETING_AUDIO_FAILED", error);
      alexLog("voice:BROWSER_VOICE_FALLBACK_BLOCKED");
    }
  }, [speak]);

  /**
   * V6/V7: unlockAudio — unlock AudioContext + immediately speak greeting.
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

      // Speak greeting immediately after unlock — no mic wait
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
