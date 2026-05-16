/**
 * Alex 100M — ElevenLabs TTS Service
 * V8: Hard timeout + AbortController + fallback JSON detected as failure.
 * - Never resolves silently when no audio actually played
 * - Aborts in-flight request after TTS_TIMEOUT_MS
 * - Logs structured events for observability
 */

import { supabase } from "@/integrations/supabase/client";
import { alexLog } from "../utils/alexDebug";
import { ALEX_VOICE_BASE, getVoiceConfigFor } from "@/config/alexVoiceConfig";
import { prepareAlexSpeechText, type AlexSpeechLang } from "@/lib/prepareAlexSpeechText";

// LOCKED: Alex master voice — single source of truth (alexVoiceConfig).
export const ALEX_PRIMARY_VOICE_ID = ALEX_VOICE_BASE.voiceId;
export const ALEX_LANGUAGE = "fr" as const;

export const TTS_TIMEOUT_MS = 20000;

const HOMEOWNER_TUNING = getVoiceConfigFor("homeowner");
const VOICE_SETTINGS = {
  stability: HOMEOWNER_TUNING.stability,
  similarity_boost: HOMEOWNER_TUNING.similarity_boost,
  style: HOMEOWNER_TUNING.style,
  use_speaker_boost: HOMEOWNER_TUNING.use_speaker_boost,
  speed: HOMEOWNER_TUNING.speed,
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

    // Detect language for pronunciation pre-process. Default to French.
    let lang: AlexSpeechLang = "fr";
    try {
      // Lazy import to avoid circular dep with alexStore.
      const { useAlexStore } = await import("../state/alexStore");
      const active = useAlexStore.getState().activeLanguage;
      lang = active && active.toLowerCase().startsWith("en") ? "en" : "fr";
    } catch {}
    const ttsText = prepareAlexSpeechText(text, lang);

    alexLog("[ALEX_TTS_START]", { text: ttsText.slice(0, 80), lang });

    // Hard timeout: abort request if it takes too long
    const timeoutId = window.setTimeout(() => {
      alexLog("[ALEX_TTS_TIMEOUT]", { ms: TTS_TIMEOUT_MS });
      try { abort.abort(); } catch {}
    }, TTS_TIMEOUT_MS);

    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/alex-tts`;
      const anon = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const { data: sessionData } = await Promise.race([
        supabase.auth.getSession(),
        new Promise<any>((resolve) => window.setTimeout(() => resolve({ data: { session: null } }), 600)),
      ]);
      const authToken = sessionData?.session?.access_token ?? anon;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: anon,
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ text: ttsText, settings: VOICE_SETTINGS, voice_id: ALEX_PRIMARY_VOICE_ID }),
        signal: abort.signal,
      });

      window.clearTimeout(timeoutId);
      if (abort.signal.aborted) {
        throw new TTSUnavailableError("TTS_TIMEOUT", "TTS request aborted (timeout)");
      }

      if (!resp.ok) {
        const errorText = await resp.text().catch(() => "tts_error");
        alexLog("[ALEX_TTS_ERROR]", { error: errorText.slice(0, 160), status: resp.status });
        throw new TTSUnavailableError("TTS_ERROR", errorText || `http_${resp.status}`);
      }

      const contentType = resp.headers.get("content-type") || "";
      const data = contentType.includes("application/json")
        ? await resp.json().catch(() => null)
        : await resp.blob();

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
