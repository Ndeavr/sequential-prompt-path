/**
 * useAlexVoiceSession — Stable voice conversation state machine for Alex.
 *
 * States: IDLE → LISTENING → THINKING → SPEAKING → LISTENING (loop)
 *
 * Features:
 * - Single authoritative state (no derived booleans)
 * - Echo protection (STT disabled while speaking + post-speech delay)
 * - Anti-loop guard (detects rapid state oscillation)
 * - Response limiting (max 2 sentences sent to TTS)
 * - Barge-in (user speech interrupts Alex)
 * - Debounced session open/close
 */
import { useState, useCallback, useRef, useEffect } from "react";
import { useAlex } from "@/hooks/useAlex";
import { useAlexVoice } from "@/hooks/useAlexVoice";

export type VoiceState = "idle" | "listening" | "thinking" | "speaking";

interface UseAlexVoiceSessionOptions {
  /** Called when Alex produces text (for UI display) */
  onTranscript?: (role: "user" | "assistant", text: string) => void;
}

// Limit spoken output to max 2 sentences
function truncateToTwoSentences(text: string): string {
  // Split on sentence-ending punctuation followed by space or end
  const sentences: string[] = [];
  const regex = /[^.!?]*[.!?]+[\s]*/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    sentences.push(match[0].trim());
    if (sentences.length >= 2) break;
  }
  if (sentences.length === 0) {
    // No sentence boundary found — return first ~120 chars
    return text.length > 120 ? text.slice(0, 120).trim() + "." : text;
  }
  return sentences.join(" ");
}

export function useAlexVoiceSession(opts?: UseAlexVoiceSessionOptions) {
  const [state, setState] = useState<VoiceState>("idle");
  const [sessionActive, setSessionActive] = useState(false);

  const stateRef = useRef<VoiceState>("idle");
  const sessionRef = useRef(false);
  const optsRef = useRef(opts);
  optsRef.current = opts;

  // Anti-loop: track state changes
  const stateChangeTimestamps = useRef<number[]>([]);
  const frozenUntil = useRef(0);

  // STT refs
  const recRef = useRef<any>(null);
  const sttSupported = useRef(false);
  const listeningRef = useRef(false);

  // Post-speech delay
  const postSpeechTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce open/close
  const sessionDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track if greeting was spoken
  const greetingSpoken = useRef(false);

  // Barge-in flag
  const bargeInRef = useRef(false);

  // ─── TTS ───
  const { isSpeaking, speak, stop: stopTTS } = useAlexVoice();

  // ─── Sentence buffer for TTS ───
  const handleSentenceReady = useCallback((sentence: string) => {
    if (!sessionRef.current || bargeInRef.current) return;
    // Truncate to keep responses short
    const limited = truncateToTwoSentences(sentence);
    speak(limited);
  }, [speak]);

  const handleResponseComplete = useCallback((fullText: string) => {
    bargeInRef.current = false;
  }, []);

  // ─── LLM chat ───
  const { messages, isStreaming, sendMessage, cancel, reset } = useAlex({
    onSentenceReady: handleSentenceReady,
    onResponseComplete: handleResponseComplete,
  });

  // ─── Safe state setter with anti-loop ───
  const safeSetState = useCallback((newState: VoiceState) => {
    const now = Date.now();

    // If frozen, ignore unless idle
    if (now < frozenUntil.current && newState !== "idle") {
      console.log("[VoiceSession] Frozen, ignoring state change to", newState);
      return;
    }

    // Anti-loop detection: >4 changes in 3s → freeze for 2s
    stateChangeTimestamps.current.push(now);
    stateChangeTimestamps.current = stateChangeTimestamps.current.filter(t => now - t < 3000);
    if (stateChangeTimestamps.current.length > 4) {
      console.warn("[VoiceSession] Anti-loop triggered, freezing for 2s");
      frozenUntil.current = now + 2000;
      stateChangeTimestamps.current = [];
      // Stay in listening if session active
      if (sessionRef.current) {
        stateRef.current = "listening";
        setState("listening");
      }
      return;
    }

    stateRef.current = newState;
    setState(newState);
  }, []);

  // ─── STT setup ───
  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { sttSupported.current = false; return; }
    sttSupported.current = true;

    const r = new SR();
    r.lang = "fr-CA";
    r.continuous = false;
    r.interimResults = false;

    r.onresult = (e: any) => {
      const transcript = e.results[0]?.[0]?.transcript;
      if (!transcript?.trim()) return;
      if (!sessionRef.current) return;

      console.log("[VoiceSession] User said:", transcript);

      // Barge-in: stop Alex if speaking
      bargeInRef.current = true;
      stopTTS();
      cancel();

      // Move to thinking
      safeSetState("thinking");
      listeningRef.current = false;

      optsRef.current?.onTranscript?.("user", transcript);
      sendMessage(transcript, { voiceMode: true });
    };

    r.onerror = (e: any) => {
      console.log("[VoiceSession] STT error:", e.error);
      listeningRef.current = false;

      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        safeSetState("idle");
        return;
      }

      // Auto-restart if session active and in listening state
      if (sessionRef.current && stateRef.current === "listening") {
        setTimeout(() => {
          if (sessionRef.current && stateRef.current === "listening" && !listeningRef.current) {
            startSTT();
          }
        }, 500);
      }
    };

    r.onend = () => {
      listeningRef.current = false;

      // Auto-restart if we should be listening
      if (sessionRef.current && stateRef.current === "listening") {
        setTimeout(() => {
          if (sessionRef.current && stateRef.current === "listening" && !listeningRef.current) {
            startSTT();
          }
        }, 300);
      }
    };

    recRef.current = r;
  }, [safeSetState, stopTTS, cancel, sendMessage]);

  const startSTT = useCallback(() => {
    if (!recRef.current || listeningRef.current) return;
    try {
      recRef.current.start();
      listeningRef.current = true;
    } catch {
      // Already started
    }
  }, []);

  const stopSTT = useCallback(() => {
    listeningRef.current = false;
    try { recRef.current?.stop(); } catch { /* */ }
  }, []);

  // ─── Sync TTS state → voice state ───
  useEffect(() => {
    if (!sessionRef.current) return;

    if (isSpeaking) {
      // Speaking — stop listening to prevent echo
      stopSTT();
      safeSetState("speaking");
    } else if (!isSpeaking && stateRef.current === "speaking") {
      // Finished speaking — post-speech delay then listen
      if (postSpeechTimer.current) clearTimeout(postSpeechTimer.current);
      postSpeechTimer.current = setTimeout(() => {
        if (sessionRef.current && !isStreaming) {
          safeSetState("listening");
          startSTT();
        }
      }, 350); // 350ms echo protection delay
    }
  }, [isSpeaking, isStreaming, safeSetState, stopSTT, startSTT]);

  // ─── Sync streaming state → voice state ───
  useEffect(() => {
    if (!sessionRef.current) return;

    if (isStreaming && stateRef.current === "listening") {
      // LLM started responding
      safeSetState("thinking");
      stopSTT();
    } else if (!isStreaming && stateRef.current === "thinking" && !isSpeaking) {
      // Streaming done, no TTS playing — go to listening
      if (postSpeechTimer.current) clearTimeout(postSpeechTimer.current);
      postSpeechTimer.current = setTimeout(() => {
        if (sessionRef.current) {
          safeSetState("listening");
          startSTT();
        }
      }, 350);
    }
  }, [isStreaming, isSpeaking, safeSetState, stopSTT, startSTT]);

  // ─── Open session ───
  const openSession = useCallback((greetingText?: string) => {
    if (sessionRef.current) return; // Already open
    if (sessionDebounce.current) clearTimeout(sessionDebounce.current);

    sessionDebounce.current = setTimeout(() => {
      if (!sttSupported.current) {
        console.warn("[VoiceSession] STT not supported");
        return;
      }

      console.log("[VoiceSession] Opening session");
      sessionRef.current = true;
      setSessionActive(true);
      greetingSpoken.current = false;
      bargeInRef.current = false;
      stateChangeTimestamps.current = [];
      frozenUntil.current = 0;

      if (greetingText) {
        safeSetState("speaking");
        speak(greetingText, () => {
          greetingSpoken.current = true;
          // After greeting, start listening with echo delay
          if (postSpeechTimer.current) clearTimeout(postSpeechTimer.current);
          postSpeechTimer.current = setTimeout(() => {
            if (sessionRef.current) {
              safeSetState("listening");
              startSTT();
            }
          }, 350);
        });
      } else {
        safeSetState("listening");
        startSTT();
      }
    }, 100); // Debounce open
  }, [safeSetState, speak, startSTT]);

  // ─── Close session ───
  const closeSession = useCallback(() => {
    if (sessionDebounce.current) clearTimeout(sessionDebounce.current);
    if (postSpeechTimer.current) clearTimeout(postSpeechTimer.current);

    console.log("[VoiceSession] Closing session");
    sessionRef.current = false;
    setSessionActive(false);
    greetingSpoken.current = false;
    bargeInRef.current = false;

    stopSTT();
    stopTTS();
    cancel();
    safeSetState("idle");
  }, [stopSTT, stopTTS, cancel, safeSetState]);

  // ─── Manual stop speaking (mute button) ───
  const muteSpeech = useCallback(() => {
    bargeInRef.current = true;
    stopTTS();
    cancel();
    // Go to listening after brief delay
    if (postSpeechTimer.current) clearTimeout(postSpeechTimer.current);
    postSpeechTimer.current = setTimeout(() => {
      if (sessionRef.current) {
        bargeInRef.current = false;
        safeSetState("listening");
        startSTT();
      }
    }, 300);
  }, [stopTTS, cancel, safeSetState, startSTT]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (postSpeechTimer.current) clearTimeout(postSpeechTimer.current);
      if (sessionDebounce.current) clearTimeout(sessionDebounce.current);
      sessionRef.current = false;
      stopSTT();
      stopTTS();
    };
  }, [stopSTT, stopTTS]);

  return {
    state,
    sessionActive,
    messages,
    isStreaming,
    sttSupported: sttSupported.current,
    openSession,
    closeSession,
    muteSpeech,
    resetChat: reset,
    sendMessage,
  };
}
