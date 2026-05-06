/**
 * Alex 100M — Voice Hook V8
 * - Hard timeout via elevenlabsService
 * - Fallback chat instead of infinite retry
 * - Marks TTS activity for watchdog
 */

import { useCallback, useEffect, useRef } from "react";
import { useAlexStore } from "../state/alexStore";
import { elevenlabsService, TTSUnavailableError } from "../services/elevenlabsService";
import {
  recordVoiceFailure,
  switchAlexToChatFallback,
  isVoiceTemporarilyDisabled,
  recoverAlex as recoverAlexImpl,
  MAX_TTS_RETRIES,
} from "../services/alexHardRecovery";
import { alexLog } from "../utils/alexDebug";

function handleTTSFailure(err: unknown) {
  const code = err instanceof TTSUnavailableError ? err.code : "TTS_ERROR";
  recordVoiceFailure(code);
  const message = "La voix d'Alex est temporairement indisponible. Je continue ici.";
  // Soft-degrade: mark unavailable + show notice. Do not auto-open chat overlay
  // (that would be too aggressive for a single greeting failure).
  useAlexStore.getState().markVoiceUnavailable(code, message);
}

export function useAlexVoice() {
  const isMounted = useRef(true);
  const isUserSpeaking = useAlexStore((s) => s.isUserSpeaking);

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

    if (isVoiceTemporarilyDisabled()) {
      alexLog("voice:skip_disabled_temp");
      return;
    }
    if (!state.isVoiceAvailable || !state.isAudioUnlocked) {
      alexLog("voice:skip_no_audio");
      return;
    }

    if (state.hasActivePlayback || state.hasActiveTTSRequest) {
      elevenlabsService.stop();
      state.stopSpeaking();
    }

    try {
      state.startConnectingVoice();
      state.markTTSActivity();

      await elevenlabsService.speak(
        text,
        () => {
          if (isMounted.current) {
            useAlexStore.getState().startSpeaking();
            useAlexStore.getState().markTTSActivity();
          }
        },
        () => {
          if (isMounted.current) {
            useAlexStore.getState().stopSpeaking();
          }
        }
      );
    } catch (err) {
      if (isMounted.current) {
        useAlexStore.getState().stopSpeaking();
      }
      handleTTSFailure(err);
    }
  }, []);

  const stop = useCallback(() => {
    elevenlabsService.stop();
    useAlexStore.getState().stopSpeaking();
    alexLog("voice:manual_stop");
  }, []);

  const speakGreetingNow = useCallback(async () => {
    const state = useAlexStore.getState();
    const greeting =
      state.pendingGreetingText ||
      state.messages.find((m) => m.role === "assistant")?.text;

    if (!greeting) return;

    if (state.hasActivePlayback || state.hasActiveTTSRequest) {
      elevenlabsService.stop();
      state.stopSpeaking();
    }

    try {
      state.startConnectingVoice();
      state.markTTSActivity();

      await elevenlabsService.speak(
        greeting,
        () => {
          if (isMounted.current) {
            useAlexStore.getState().startSpeaking();
            useAlexStore.getState().markTTSActivity();
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
    } catch (err) {
      if (isMounted.current) useAlexStore.getState().stopSpeaking();
      handleTTSFailure(err);
    }
  }, []);

  const unlockAudio = useCallback(async () => {
    try {
      elevenlabsService.init();
      useAlexStore.setState({ isVoiceAvailable: elevenlabsService.isReady() });

      const Ctor = window.AudioContext || (window as any).webkitAudioContext;
      if (Ctor) {
        const ctx = new Ctor();
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
      await speakGreetingNow();
    } catch (err) {
      useAlexStore.setState({ isAutoplayAllowed: false, mode: "ready" });
      useAlexStore.getState().stopSpeaking();
      alexLog("voice:unlock_failed", err);
    }
  }, [speakGreetingNow]);

  const recoverAlex = useCallback(async () => {
    await recoverAlexImpl();
    await unlockAudio();
  }, [unlockAudio]);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      elevenlabsService.stop();
    };
  }, []);

  return { speak, stop, unlockAudio, speakGreetingNow, recoverAlex, MAX_TTS_RETRIES };
}
