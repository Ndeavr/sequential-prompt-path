/**
 * useAlexTurnController — Orchestrates the full voice pipeline turn.
 * Coordinates: AudioCapture → VAD → STT → Normalize → Brain → TTS → Playback
 * 
 * Zero artificial delay. Starts response as soon as utterance is finalized.
 */
import { useState, useRef, useCallback } from "react";
import { normalizeUserTranscript, normalizeAlexOutputText } from "@/services/alexPronunciationNormalizer";
import { isInternalThinking, cleanAlexOutput } from "@/services/alexTranscriptNormalizer";

import { supabase } from "@/integrations/supabase/client";

export type TurnState =
  | "idle"
  | "listening"
  | "speech_detected"
  | "transcribing"
  | "thinking"
  | "speaking"
  | "interrupted"
  | "recovering"
  | "error"
  | "fallback_text";

interface TurnTimingLog {
  turnIndex: number;
  startListenAt: number;
  stopListenAt: number;
  sttFinalAt: number;
  llmFirstTokenAt: number;
  ttsStartAt: number;
  playbackStartAt: number;
  totalLatencyMs: number;
}

interface TurnControllerCallbacks {
  onStateChange?: (state: TurnState) => void;
  onAlexResponse?: (text: string) => void;
  onUserTranscript?: (text: string) => void;
  onTimingLog?: (log: TurnTimingLog) => void;
  onError?: (error: unknown) => void;
}

export function useAlexTurnController(callbacks?: TurnControllerCallbacks) {
  const [state, setState] = useState<TurnState>("idle");
  const [turnIndex, setTurnIndex] = useState(0);
  const [lastLatencyMs, setLastLatencyMs] = useState<number | null>(null);

  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;
  const timingRef = useRef<Partial<TurnTimingLog>>({});
  const isInterruptedRef = useRef(false);

  const setTurnState = useCallback((newState: TurnState) => {
    setState(newState);
    callbacksRef.current?.onStateChange?.(newState);
  }, []);

  /** Called when user starts speaking */
  const onUserSpeechStart = useCallback(() => {
    // If Alex is speaking, interrupt
    if (state === "speaking") {
      isInterruptedRef.current = true;
      setTurnState("interrupted");
      return;
    }

    timingRef.current = { startListenAt: Date.now() };
    setTurnState("speech_detected");
  }, [state, setTurnState]);

  /** Called when VAD finalizes an utterance */
  const onUtteranceFinalized = useCallback(async (rawTranscript: string, confidence?: number) => {
    timingRef.current.stopListenAt = Date.now();
    setTurnState("transcribing");

    // Normalize the transcript
    const normalized = normalizeUserTranscript(rawTranscript);
    timingRef.current.sttFinalAt = Date.now();
    
    callbacksRef.current?.onUserTranscript?.(normalized);

    // Skip if transcript is too short or meaningless
    if (!normalized || normalized.trim().length < 2) {
      setTurnState("listening");
      return;
    }

    setTurnState("thinking");

    // Log the timing
    const currentTurn = turnIndex;
    setTurnIndex(prev => prev + 1);

    // The actual LLM response is handled by the Gemini session
    // This controller just tracks timing and state
    timingRef.current.llmFirstTokenAt = Date.now();
  }, [turnIndex, setTurnState]);

  /** Called when Alex's response text is ready */
  const onAlexResponseReady = useCallback((rawText: string) => {
    if (isInterruptedRef.current) {
      isInterruptedRef.current = false;
      setTurnState("listening");
      return;
    }

    // Filter internal thinking
    if (isInternalThinking(rawText)) return;

    // Clean and normalize
    const cleaned = normalizeAlexOutputText(cleanAlexOutput(rawText));
    if (!cleaned || cleaned.trim().length === 0) return;

    timingRef.current.ttsStartAt = Date.now();
    setTurnState("speaking");
    callbacksRef.current?.onAlexResponse?.(cleaned);
  }, [setTurnState]);

  /** Called when TTS playback starts */
  const onPlaybackStart = useCallback(() => {
    timingRef.current.playbackStartAt = Date.now();

    // Calculate total latency
    if (timingRef.current.stopListenAt && timingRef.current.playbackStartAt) {
      const latency = timingRef.current.playbackStartAt - timingRef.current.stopListenAt;
      setLastLatencyMs(latency);

      const fullLog: TurnTimingLog = {
        turnIndex,
        startListenAt: timingRef.current.startListenAt || 0,
        stopListenAt: timingRef.current.stopListenAt || 0,
        sttFinalAt: timingRef.current.sttFinalAt || 0,
        llmFirstTokenAt: timingRef.current.llmFirstTokenAt || 0,
        ttsStartAt: timingRef.current.ttsStartAt || 0,
        playbackStartAt: timingRef.current.playbackStartAt || 0,
        totalLatencyMs: latency,
      };

      callbacksRef.current?.onTimingLog?.(fullLog);
      console.log(`[TurnController] Turn ${turnIndex} latency: ${latency}ms`);
    }
  }, [turnIndex]);

  /** Called when Alex finishes speaking */
  const onPlaybackEnd = useCallback(() => {
    setTurnState("listening");
  }, [setTurnState]);

  /** Called on barge-in (user interrupts Alex) */
  const onBargeIn = useCallback(() => {
    isInterruptedRef.current = true;
    setTurnState("interrupted");
    // Quick recovery
    setTimeout(() => {
      isInterruptedRef.current = false;
      setTurnState("listening");
    }, 100);
  }, [setTurnState]);

  /** Reset controller */
  const reset = useCallback(() => {
    setState("idle");
    setTurnIndex(0);
    setLastLatencyMs(null);
    isInterruptedRef.current = false;
    timingRef.current = {};
  }, []);

  return {
    state,
    turnIndex,
    lastLatencyMs,
    onUserSpeechStart,
    onUtteranceFinalized,
    onAlexResponseReady,
    onPlaybackStart,
    onPlaybackEnd,
    onBargeIn,
    reset,
  };
}
