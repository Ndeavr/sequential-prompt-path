/**
 * GeminiService — Client-side configuration & types for Alex voice.
 *
 * NOTE: Actual AI calls go through the alex-voice edge function.
 * This file provides types, config constants, and the text pipeline
 * used by the frontend to prepare/display Alex responses.
 *
 * For Gemini Live (real-time audio), see the edge function implementation.
 */

import {
  ALEX_TEXT_CONFIG,
  ALEX_LIVE_CONFIG,
  buildFinalAlexSpeech,
  type AlexRuntimeContext,
} from "./alexConfig";

// Re-export audio codec utilities for backward compatibility
export {
  encodeToBase64 as encode,
  decodeFromBase64 as decode,
  decodeAudioData,
  createPcmBlob as createBlob,
} from "./geminiAudioCodec";

// ─── Types ───

export type GenerateAlexTextInput = {
  userText: string;
  context?: AlexRuntimeContext;
};

export type GenerateAlexTextOutput = {
  rawText: string;
  spokenText: string;
  transcriptText: string;
};

export type LiveCallbacks = {
  onOpen?: () => void;
  onAudioChunk?: (base64Pcm24k: string) => void;
  onInputTranscript?: (text: string, isFinal: boolean) => void;
  onOutputTranscript?: (text: string, isFinal: boolean) => void;
  onInterrupted?: () => void;
  onTurnComplete?: () => void;
  onError?: (error: unknown) => void;
};

// ─── Client-side text pipeline (no API call) ───

/**
 * Transforms raw AI text through the full Alex French pipeline.
 * Use this client-side when you already have the raw text from the edge function.
 */
export function processAlexTextLocally(input: {
  rawText: string;
  context?: AlexRuntimeContext;
}): GenerateAlexTextOutput {
  const final = buildFinalAlexSpeech({
    rawText: input.rawText,
    context: input.context,
  });

  return {
    rawText: input.rawText,
    spokenText: final.spokenText,
    transcriptText: final.transcriptText,
  };
}

// ─── Config exports for edge function reference ───

export const GEMINI_TEXT_MODEL = ALEX_TEXT_CONFIG.model;
export const GEMINI_LIVE_MODEL = ALEX_LIVE_CONFIG.model;
export const GEMINI_TEXT_TEMPERATURE = ALEX_TEXT_CONFIG.config.temperature;
export const GEMINI_LIVE_VOICE = ALEX_LIVE_CONFIG.config.speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName;

/**
 * Helper: build the edge function payload for Alex voice calls.
 * Use with the alex-voice edge function's "respond-stream" action.
 */
export function buildAlexVoicePayload(input: {
  userMessage: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  sessionId: string | null;
  userName?: string | null;
  preferredSpokenName?: string | null;
  context?: Record<string, unknown>;
  voiceProfile?: string;
  mode?: string;
}) {
  return {
    action: "respond-stream",
    sessionId: input.sessionId,
    userMessage: input.userMessage,
    messages: input.messages,
    userName: input.userName,
    preferredSpokenName: input.preferredSpokenName,
    context: input.context,
    voiceProfile: input.voiceProfile,
    mode: input.mode,
  };
}
