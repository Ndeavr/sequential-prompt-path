/**
 * Alex 100M — Speech-to-Text Service
 * Uses browser SpeechRecognition API with proper cleanup.
 */

import type { STTTranscriptEvent } from "../types/alex.types";
import { alexLog } from "../utils/alexDebug";

type STTCallback = (event: STTTranscriptEvent) => void;

let recognition: ReturnType<typeof getSpeechRecognition> = null;
let subscriber: STTCallback | null = null;
let startTime = 0;
let isRunning = false;

function getSpeechRecognition() {
  const SR =
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition;
  if (!SR) return null;
  return new SR();
}

export const sttService = {
  isAvailable(): boolean {
    return !!(
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition
    );
  },

  start(lang: string = "fr-CA"): void {
    if (isRunning) this.stop();

    recognition = getSpeechRecognition();
    if (!recognition) {
      alexLog("stt:unavailable");
      return;
    }

    recognition.lang = lang;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    startTime = Date.now();

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const last = event.results[event.results.length - 1];
      if (!last) return;

      const transcript = last[0].transcript.trim();
      const confidence = last[0].confidence;
      const isFinal = last.isFinal;
      const durationMs = Date.now() - startTime;

      if (transcript && subscriber) {
        subscriber({ text: transcript, confidence, durationMs, isFinal });
      }
    };

    recognition.onerror = (e) => {
      alexLog("stt:error", { error: e.error });
      if (e.error !== "aborted") {
        isRunning = false;
      }
    };

    recognition.onend = () => {
      // Auto-restart if we didn't explicitly stop
      if (isRunning && recognition) {
        try {
          recognition.start();
        } catch {
          isRunning = false;
        }
      }
    };

    try {
      recognition.start();
      isRunning = true;
      alexLog("stt:start", { lang });
    } catch (err) {
      alexLog("stt:start:error", err);
      isRunning = false;
    }
  },

  stop(): void {
    isRunning = false;
    if (recognition) {
      try {
        recognition.abort();
      } catch {
        // ignore
      }
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition = null;
    }
    alexLog("stt:stop");
  },

  subscribe(cb: STTCallback): void {
    subscriber = cb;
  },

  unsubscribe(): void {
    subscriber = null;
  },
};
