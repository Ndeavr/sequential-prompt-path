/**
 * useAlexClientVAD — Client-side Voice Activity Detection
 * Determines when the user starts/stops speaking.
 * Controls turn-taking before sending to server.
 */
import { useState, useRef, useCallback } from "react";

export interface VADConfig {
  /** Minimum speech duration to consider valid (ms) */
  minSpeechMs: number;
  /** Max silence gap before finalizing utterance (ms) */
  maxSilenceGapMs: number;
  /** Ultra-fast mode for first turn */
  firstTurnFast: boolean;
  /** Silence duration for first turn (ms) */
  firstTurnSilenceMs: number;
  /** Silence duration for subsequent turns (ms) */
  normalSilenceMs: number;
}

const DEFAULT_VAD_CONFIG: VADConfig = {
  minSpeechMs: 180,
  maxSilenceGapMs: 450,
  firstTurnFast: true,
  firstTurnSilenceMs: 140,
  normalSilenceMs: 220,
};

export type VADState = "idle" | "speech" | "silence" | "finalized";

interface VADCallbacks {
  onUtteranceStart?: () => void;
  onUtteranceEnd?: () => void;
  onUtteranceFinalized?: (durationMs: number) => void;
}

export function useAlexClientVAD(
  callbacks?: VADCallbacks,
  config?: Partial<VADConfig>
) {
  const cfg = { ...DEFAULT_VAD_CONFIG, ...config };
  const [state, setState] = useState<VADState>("idle");
  const [turnIndex, setTurnIndex] = useState(0);

  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  const speechStartRef = useRef(0);
  const lastSpeechRef = useRef(0);
  const silenceTimerRef = useRef<number | null>(null);
  const isUtteranceActiveRef = useRef(false);

  const getCurrentSilenceThreshold = useCallback(() => {
    if (cfg.firstTurnFast && turnIndex === 0) {
      return cfg.firstTurnSilenceMs;
    }
    return cfg.normalSilenceMs;
  }, [cfg, turnIndex]);

  /** Called when noise gate detects speech start */
  const onSpeechStart = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    if (!isUtteranceActiveRef.current) {
      isUtteranceActiveRef.current = true;
      speechStartRef.current = Date.now();
      setState("speech");
      callbacksRef.current?.onUtteranceStart?.();
    } else {
      setState("speech");
    }
    lastSpeechRef.current = Date.now();
  }, []);

  /** Called when noise gate detects speech end */
  const onSpeechEnd = useCallback(() => {
    if (!isUtteranceActiveRef.current) return;
    
    setState("silence");
    const threshold = getCurrentSilenceThreshold();

    silenceTimerRef.current = window.setTimeout(() => {
      const duration = Date.now() - speechStartRef.current;
      if (duration >= cfg.minSpeechMs) {
        isUtteranceActiveRef.current = false;
        setState("finalized");
        setTurnIndex(prev => prev + 1);
        callbacksRef.current?.onUtteranceFinalized?.(duration);
      }
      silenceTimerRef.current = null;
    }, threshold);
  }, [cfg, getCurrentSilenceThreshold]);

  /** Reset VAD state for new session */
  const reset = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    isUtteranceActiveRef.current = false;
    setState("idle");
    setTurnIndex(0);
  }, []);

  /** Force finalize current utterance */
  const forceFinalize = useCallback(() => {
    if (isUtteranceActiveRef.current) {
      const duration = Date.now() - speechStartRef.current;
      isUtteranceActiveRef.current = false;
      setState("finalized");
      setTurnIndex(prev => prev + 1);
      callbacksRef.current?.onUtteranceFinalized?.(duration);
    }
  }, []);

  return {
    state,
    turnIndex,
    onSpeechStart,
    onSpeechEnd,
    reset,
    forceFinalize,
    isUtteranceActive: isUtteranceActiveRef.current,
  };
}
