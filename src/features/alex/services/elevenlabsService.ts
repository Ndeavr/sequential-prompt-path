/**
 * Alex 100M — ElevenLabs TTS Service
 * V8: Hard timeout + AbortController + fallback JSON detected as failure.
 * - Never resolves silently when no audio actually played
 * - Aborts in-flight request after TTS_TIMEOUT_MS
 * - Logs structured events for observability
 */

import { supabase } from "@/integrations/supabase/client";
import { alexLog } from "../utils/alexDebug";

// LOCKED: Alex master voice — French only (Quebec)
export const ALEX_PRIMARY_VOICE_ID = "UJCi4DDncuo0VJDSIegj";
export const ALEX_LANGUAGE = "fr" as const;

export const TTS_TIMEOUT_MS = 8000;

const VOICE_SETTINGS = {
  stability: 0.5,
  similarity_boost: 0.75,
  style: 0.4,
  use_speaker_boost: true,
  speed: 1.0,
};

let currentAudio: HTMLAudioElement | null = null;
let currentObjectUrl: string | null = null;
let currentAbort: AbortController | null = null;
let initialized = false;

export class TTSUnavailableError extends Error {
  code: "TTS_FALLBACK" | "TTS_TIMEOUT" | "TTS_ABORT" | "TTS_ERROR";
  constructor(code: TTSUnavailableError["code"], message: string) {
    super(message);
    this.code = code;
  }
}

function cleanup() {
  if (currentAudio) {
    try { currentAudio.pause(); } catch {}
    currentAudio.onended = null;
    currentAudio.onerror = null;
    currentAudio.src = "";
    currentAudio = null;
  }
  if (currentObjectUrl) {
    URL.revokeObjectURL(currentObjectUrl);
    currentObjectUrl = null;
  }
}

function abortInFlight() {
  if (currentAbort) {
    try { currentAbort.abort(); } catch {}
    currentAbort = null;
  }
}

export const elevenlabsService = {
  init(): void {
    initialized = true;
    alexLog("tts:init");
  },

  isReady(): boolean {
    return initialized;
  },

  async speak(
    text: string,
    onStart?: () => void,
    onEnd?: () => void,
  ): Promise<void> {
    cleanup();
    abortInFlight();

    const abort = new AbortController();
    currentAbort = abort;
    const startedAt = Date.now();

    alexLog("[ALEX_TTS_START]", { text: text.slice(0, 80) });

    // Hard timeout: abort request if it takes too long
    const timeoutId = window.setTimeout(() => {
      alexLog("[ALEX_TTS_TIMEOUT]", { ms: TTS_TIMEOUT_MS });
      try { abort.abort(); } catch {}
    }, TTS_TIMEOUT_MS);

    try {
      const { data, error } = await supabase.functions.invoke("alex-tts", {
        body: { text, settings: VOICE_SETTINGS },
      });

      window.clearTimeout(timeoutId);
      if (abort.signal.aborted) {
        throw new TTSUnavailableError("TTS_TIMEOUT", "TTS request aborted (timeout)");
      }

      if (error) {
        alexLog("[ALEX_TTS_ERROR]", { error: error.message });
        throw new TTSUnavailableError("TTS_ERROR", error.message || "tts_error");
      }

      // Edge fallback signal — NOT a success
      if (data && typeof data === "object" && (data.fallback === true || data.error === "tts_unavailable")) {
        alexLog("[ALEX_TTS_FALLBACK]", data);
        throw new TTSUnavailableError("TTS_FALLBACK", data.message || "tts_unavailable");
      }

      let audioUrl: string;
      if (data instanceof Blob) {
        currentObjectUrl = URL.createObjectURL(data);
        audioUrl = currentObjectUrl;
      } else if (data?.audioContent) {
        audioUrl = `data:audio/mpeg;base64,${data.audioContent}`;
      } else {
        throw new TTSUnavailableError("TTS_ERROR", "Unexpected TTS response format");
      }

      const audio = new Audio(audioUrl);
      currentAudio = audio;

      return new Promise<void>((resolve, reject) => {
        audio.onended = () => {
          cleanup();
          currentAbort = null;
          alexLog("[ALEX_TTS_SUCCESS]", { ms: Date.now() - startedAt });
          onEnd?.();
          resolve();
        };
        audio.onerror = () => {
          cleanup();
          currentAbort = null;
          onEnd?.();
          reject(new TTSUnavailableError("TTS_ERROR", "audio_error"));
        };

        audio.play().then(() => {
          alexLog("tts:audio_play_resolved");
          onStart?.();
        }).catch((e) => {
          cleanup();
          currentAbort = null;
          onEnd?.();
          reject(new TTSUnavailableError("TTS_ERROR", e?.message || "play_failed"));
        });
      });
    } catch (err) {
      window.clearTimeout(timeoutId);
      cleanup();
      currentAbort = null;
      if (err instanceof TTSUnavailableError) {
        if (err.code === "TTS_TIMEOUT") alexLog("[ALEX_TTS_TIMEOUT]");
        else if (err.code === "TTS_FALLBACK") alexLog("[ALEX_TTS_FALLBACK]");
        else alexLog("[ALEX_TTS_ERROR]", err.message);
      } else {
        alexLog("[ALEX_TTS_ERROR]", String(err));
      }
      onEnd?.();
      throw err;
    }
  },

  stop(): void {
    abortInFlight();
    cleanup();
    alexLog("[ALEX_TTS_ABORT]");
  },

  destroy(): void {
    abortInFlight();
    cleanup();
    initialized = false;
    alexLog("tts:destroy");
  },
};
