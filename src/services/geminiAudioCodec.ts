/**
 * GeminiAudioCodec — PCM encoding/decoding utilities for Gemini Live Native Audio.
 * Converts between Float32 mic data ↔ Int16 PCM Base64 for the API,
 * and decodes incoming PCM Base64 audio to playable AudioBuffers.
 */

/** Encode Uint8Array → Base64 string */
export function encodeToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/** Decode Base64 string → Uint8Array */
export function decodeFromBase64(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/** Decode raw Int16 PCM bytes into a playable AudioBuffer */
export function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number
): AudioBuffer {
  const dataInt16 = new Int16Array(data.buffer, data.byteOffset, data.byteLength / 2);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

/** Convert Float32 mic audio to PCM blob for Gemini Live sendRealtimeInput */
export function createPcmBlob(data: Float32Array): {
  data: string;
  mimeType: string;
} {
  const int16 = new Int16Array(data.length);
  for (let i = 0; i < data.length; i++) {
    int16[i] = Math.max(-32768, Math.min(32767, data[i] * 32768));
  }
  return {
    data: encodeToBase64(new Uint8Array(int16.buffer)),
    mimeType: "audio/pcm;rate=16000",
  };
}
