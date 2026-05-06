/**
 * Alex 100M — ElevenLabs TTS Service
 * V7: Fixed edge function contract. onStart fires after audio.play() resolves.
 * Voice ID locked to approved female Charlotte FR.
 */

import { supabase } from "@/integrations/supabase/client";
import { alexLog } from "../utils/alexDebug";

// LOCKED: Alex master voice — French only (Quebec)
export const ALEX_PRIMARY_VOICE_ID = "UJCi4DDncuo0VJDSIegj";
export const ALEX_LANGUAGE = "fr" as const;

const VOICE_SETTINGS = {
  stability: 0.5,
  similarity_boost: 0.75,
  style: 0.4,
  use_speaker_boost: true,
  speed: 1.0,
};

let currentAudio: HTMLAudioElement | null = null;
let currentObjectUrl: string | null = null;
let initialized = false;

function cleanup() {
  if (currentAudio) {
    currentAudio.pause();
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
    alexLog("tts:speak:request", { text: text.slice(0, 80) });

    try {
      // V7: Match edge function contract — send { text, settings }
      const { data, error } = await supabase.functions.invoke("alex-tts", {
        body: {
          text,
          settings: VOICE_SETTINGS,
        },
      });

      if (error) throw error;

      let audioUrl: string;

      if (data instanceof Blob) {
        currentObjectUrl = URL.createObjectURL(data);
        audioUrl = currentObjectUrl;
      } else if (data?.audioContent) {
        audioUrl = `data:audio/mpeg;base64,${data.audioContent}`;
      } else if (data?.error || data?.fallback) {
        alexLog("tts:unavailable_soft_fallback", data);
        onEnd?.();
        return;
      } else {
        throw new Error("Unexpected TTS response format");
      }

      const audio = new Audio(audioUrl);
      currentAudio = audio;

      return new Promise<void>((resolve, reject) => {
        audio.onended = () => {
          cleanup();
          onEnd?.();
          resolve();
        };
        audio.onerror = (e) => {
          cleanup();
          onEnd?.();
          reject(e);
        };

        // V7: onStart fires AFTER audio.play() resolves — real playback confirmation
        audio.play().then(() => {
          alexLog("tts:audio_play_resolved");
          onStart?.();
        }).catch((e) => {
          cleanup();
          onEnd?.();
          reject(e);
        });
      });
    } catch (err) {
      alexLog("tts:speak:error", err);
      cleanup();
      onEnd?.();
      throw err;
    }
  },

  stop(): void {
    cleanup();
    alexLog("tts:stop");
  },

  destroy(): void {
    cleanup();
    initialized = false;
    alexLog("tts:destroy");
  },
};
