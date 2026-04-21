/**
 * Alex 100M — ElevenLabs TTS Service
 * Singleton abstraction. One active playback at a time.
 */

import { supabase } from "@/integrations/supabase/client";
import { alexLog } from "../utils/alexDebug";

const VOICE_ID = "XB0fDUnXU5powFXDhCwa"; // Charlotte FR
const MODEL_ID = "eleven_turbo_v2_5";
const VOICE_SETTINGS = {
  stability: 0.43,
  similarity_boost: 0.78,
  style: 0.28,
  use_speaker_boost: true,
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
    // Cancel any current playback first
    cleanup();
    alexLog("tts:speak:request", { text: text.slice(0, 80) });

    try {
      const { data, error } = await supabase.functions.invoke("alex-tts", {
        body: {
          text,
          voiceId: VOICE_ID,
          modelId: MODEL_ID,
          voiceSettings: VOICE_SETTINGS,
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
        onStart?.();
        audio.play().catch((e) => {
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
