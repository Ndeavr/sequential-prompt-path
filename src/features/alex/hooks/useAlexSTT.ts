/**
 * Alex 100M — STT Hook
 * Clean start/stop. Streams transcript events to intent gate.
 */

import { useCallback, useEffect, useRef } from "react";
import { useAlexStore } from "../state/alexStore";
import { sttService } from "../services/sttService";
import { classifyTranscript } from "../services/alexNoiseGate";
import { alexLog } from "../utils/alexDebug";
import type { STTTranscriptEvent } from "../types/alex.types";

type TranscriptHandler = (event: STTTranscriptEvent) => void;

export function useAlexSTT(onValidTranscript?: TranscriptHandler) {
  const isMounted = useRef(true);
  const handlerRef = useRef(onValidTranscript);
  handlerRef.current = onValidTranscript;

  const isSTTAvailable = useAlexStore((s) => s.isSTTAvailable);
  const activeLanguage = useAlexStore((s) => s.activeLanguage);

  const handleTranscript = useCallback((event: STTTranscriptEvent) => {
    if (!isMounted.current) return;
    if (!event.isFinal) return; // Only process final results

    const classification = classifyTranscript(event);
    const state = useAlexStore.getState();

    switch (classification) {
      case "valid_input":
        state.markUserEngaged();
        state.resetNoResponse();
        useAlexStore.setState({ isUserSpeaking: false, isBackgroundNoise: false, hasLowConfidenceAudio: false });
        handlerRef.current?.(event);
        alexLog("stt:valid_input", { text: event.text.slice(0, 60) });
        break;

      case "low_confidence":
        state.markLowConfidenceAudio();
        alexLog("stt:low_confidence", { text: event.text.slice(0, 40) });
        break;

      case "background_noise":
        state.markNoiseDetected();
        alexLog("stt:noise", { text: event.text.slice(0, 40) });
        break;
    }
  }, []);

  const startListening = useCallback(() => {
    if (!isSTTAvailable) {
      alexLog("stt:unavailable");
      return;
    }

    const state = useAlexStore.getState();
    if (state.hasActivePlayback) {
      alexLog("stt:blocked_by_playback");
      return;
    }

    sttService.subscribe(handleTranscript);
    sttService.start(activeLanguage === "fr-CA" ? "fr-CA" : "en-US");
    state.startListening();
    useAlexStore.setState({ isUserSpeaking: true });
    alexLog("stt:started");
  }, [isSTTAvailable, activeLanguage, handleTranscript]);

  const stopListening = useCallback(() => {
    sttService.unsubscribe();
    sttService.stop();
    useAlexStore.getState().stopListening();
    useAlexStore.setState({ isUserSpeaking: false });
    alexLog("stt:stopped");
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      sttService.unsubscribe();
      sttService.stop();
    };
  }, []);

  return { startListening, stopListening };
}
