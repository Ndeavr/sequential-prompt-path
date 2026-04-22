/**
 * Alex 100M — ElevenLabs TTS Service
 * V7: Fixed edge function contract. onStart fires after audio.play() resolves.
 * Voice ID locked to approved female Charlotte FR.
 */

import { supabase } from "@/integrations/supabase/client";
import { alexLog } from "../utils/alexDebug";

// V7: Locked approved female voice ID
export const ALEX_PRIMARY_VOICE_ID = "XB0fDUnXU5powFXDhCwa"; // Charlotte FR — Alex premium female

const VOICE_SETTINGS = {
  stability: 0.43,
  similarity_boost: 0.78,
  style: 0.28,
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
