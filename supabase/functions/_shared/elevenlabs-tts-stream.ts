/**
 * ElevenLabsTtsProvider — WebSocket streaming TTS for Alex Voice.
 *
 * Uses ElevenLabs Input Streaming API (WebSocket) for ultra-low latency
 * sentence-by-sentence audio delivery.
 *
 * Voice: Alex (mVjOqyqTPfwlXPjV5sjX) — locked, no fallback.
 * Settings sourced from ALEX_VOICE_CONFIG — single source of truth.
 */

import { ALEX_VOICE_CONFIG, getAlexVoiceSettings, type AlexVoiceProfile } from "./alex-french-voice.ts";

export type OnAudioChunk = (base64Audio: string) => void;

/**
 * Split text into short sentences for streaming input.
 * Keeps latency low by sending small pieces.
 */
function splitSentences(text: string): string[] {
  const parts = text.split(/(?<=[.!?…])\s+/);
  return parts.map((p) => p.trim()).filter(Boolean);
}

export class ElevenLabsTtsProvider {
  private apiKey: string;

  constructor(options?: { apiKey?: string }) {
    this.apiKey = options?.apiKey || Deno.env.get("ELEVENLABS_API_KEY") || "";
  }

  /**
   * Stream TTS audio chunks for the given text via WebSocket input streaming.
   * Calls onChunk with base64-encoded MP3 data as chunks arrive.
   */
  async streamText(
    text: string,
    onChunk: OnAudioChunk,
    signal?: AbortSignal,
    voiceProfile?: AlexVoiceProfile,
  ): Promise<void> {
    if (!this.apiKey) {
      throw new Error("ELEVENLABS_API_KEY is not configured");
    }

    if (!text.trim()) return;

    const { voiceId, modelId, outputFormat } = ALEX_VOICE_CONFIG;
    const voiceSettings = voiceProfile
      ? getAlexVoiceSettings(voiceProfile)
      : ALEX_VOICE_CONFIG.voiceSettings;

    const wsUrl =
      `wss://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream-input` +
      `?model_id=${modelId}` +
      `&output_format=${outputFormat}`;

    return new Promise<void>((resolve, reject) => {
      if (signal?.aborted) {
        resolve();
        return;
      }

      let ws: WebSocket;
      let settled = false;

      const finish = (err?: Error) => {
        if (settled) return;
        settled = true;
        try { ws?.close(); } catch { /* ignore */ }
        if (err) reject(err);
        else resolve();
      };

      const onAbort = () => finish();
      signal?.addEventListener("abort", onAbort, { once: true });

      try {
        ws = new WebSocket(wsUrl);
      } catch (err) {
        finish(err instanceof Error ? err : new Error(String(err)));
        return;
      }

      ws.onopen = () => {
        // Send BOS (beginning of stream) with voice settings
        const bos = {
          text: " ",
          voice_settings: {
            stability: voiceSettings.stability,
            similarity_boost: voiceSettings.similarity_boost,
            style: voiceSettings.style,
            use_speaker_boost: voiceSettings.use_speaker_boost,
          },
          xi_api_key: this.apiKey,
          generation_config: {
            chunk_length_schedule: ALEX_VOICE_CONFIG.chunkLengthSchedule,
          },
        };
        ws.send(JSON.stringify(bos));

        // Stream sentences one by one
        const sentences = splitSentences(text);
        for (const sentence of sentences) {
          if (signal?.aborted) break;
          ws.send(JSON.stringify({ text: sentence + " " }));
        }

        // Send EOS (end of stream)
        ws.send(JSON.stringify({ text: "" }));
      };

      ws.onmessage = (event) => {
        if (signal?.aborted) {
          finish();
          return;
        }

        try {
          const data = JSON.parse(typeof event.data === "string" ? event.data : "");

          if (data.audio) {
            onChunk(data.audio);
          }

          // ElevenLabs signals end with isFinal
          if (data.isFinal) {
            finish();
          }
        } catch {
          // Non-JSON or parse error — ignore
        }
      };

      ws.onerror = (err) => {
        console.error("[ElevenLabsTts] WebSocket error:", err);
        finish(new Error("ElevenLabs TTS WebSocket error"));
      };

      ws.onclose = () => {
        finish();
      };

      // Safety timeout: 30s max per TTS call
      setTimeout(() => finish(), 30_000);
    });
  }

  /**
   * Simple non-streaming fallback via REST API.
   * Returns full base64-encoded audio.
   */
  async generateFull(text: string, voiceProfile?: AlexVoiceProfile): Promise<string> {
    if (!this.apiKey) throw new Error("ELEVENLABS_API_KEY is not configured");
    if (!text.trim()) return "";

    const { encode: base64Encode } = await import(
      "https://deno.land/std@0.168.0/encoding/base64.ts"
    );

    const { voiceId, modelId, outputFormat, chunkLengthSchedule } = ALEX_VOICE_CONFIG;
    const voiceSettings = voiceProfile
      ? getAlexVoiceSettings(voiceProfile)
      : ALEX_VOICE_CONFIG.voiceSettings;

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=${outputFormat}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": this.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          model_id: modelId,
          voice_settings: {
            stability: voiceSettings.stability,
            similarity_boost: voiceSettings.similarity_boost,
            style: voiceSettings.style,
            use_speaker_boost: voiceSettings.use_speaker_boost,
          },
          chunk_length_schedule: chunkLengthSchedule,
        }),
      },
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`ElevenLabs TTS error ${response.status}: ${errText}`);
    }

    const buffer = await response.arrayBuffer();
    return base64Encode(buffer);
  }
}
