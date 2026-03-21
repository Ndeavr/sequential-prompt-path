/**
 * useAlexVoiceSession — Unified voice session for Alex.
 *
 * Uses the `alex-voice` edge function directly (AI + TTS in one call).
 * STT via Web Speech API with continuous mode and silence detection.
 * Interrupt-safe playback with session tokens.
 *
 * NOTE: Does NOT call useAuth internally to avoid React render-order bugs.
 * Auth data is read lazily from the Supabase client at call time.
 */
import { useState, useCallback, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type VoiceState = "idle" | "listening" | "relistening" | "thinking" | "speaking";

type Msg = { role: "user" | "assistant"; content: string };

const VOICE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/alex-voice`;

// Configurable timing
const END_OF_SPEECH_SILENCE_MS = 1500;
const INTERIM_SILENCE_MS = 2000;
const RESTART_DELAY_MS = 800;
const RELISTEN_DELAY_MS = 400;
const MAX_RAPID_RESTARTS = 3;
const RAPID_RESTART_WINDOW_MS = 4000;

/** Get auth info lazily without hooks */
async function getAuthInfo() {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    session,
    accessToken: session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    userId: session?.user?.id ?? null,
    userName: session?.user?.user_metadata?.full_name?.split(" ")[0]
      || session?.user?.user_metadata?.first_name
      || null,
    isAuthenticated: !!session,
  };
}

export function useAlexVoiceSession() {
  const [state, setState] = useState<VoiceState>("idle");
  const [sessionActive, setSessionActive] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);

  const stateRef = useRef<VoiceState>("idle");
  const sessionRef = useRef(false);
  const messagesRef = useRef<Msg[]>([]);
  const sessionIdRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Playback
  const audioQueueRef = useRef<HTMLAudioElement[]>([]);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const isPlayingRef = useRef(false);
  const playbackTokenRef = useRef(0);

  // STT
  const recRef = useRef<any>(null);
  const sttSupported = useRef(false);
  const sttRunningRef = useRef(false);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finalTranscriptRef = useRef("");
  const restartTimestamps = useRef<number[]>([]);
  const gotSpeechThisCycle = useRef(false);

  // ─── Safe state ───
  const safeSetState = useCallback((s: VoiceState) => {
    stateRef.current = s;
    setState(s);
  }, []);

  // ─── Silence timer helper ───
  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  // ─── STT ───
  const stopSTT = useCallback(() => {
    clearSilenceTimer();
    if (sttRunningRef.current) {
      try { recRef.current?.stop(); } catch { /* */ }
    }
    sttRunningRef.current = false;
  }, [clearSilenceTimer]);

  const startSTT = useCallback(() => {
    if (sttRunningRef.current) return;
    if (!recRef.current || !sessionRef.current) return;
    if (isPlayingRef.current) return;
    finalTranscriptRef.current = "";
    sttRunningRef.current = true;
    try {
      recRef.current.start();
      console.log("[VoiceSession] stt_opened");
    } catch {
      sttRunningRef.current = false;
    }
  }, []);

  // ─── Prepare next listen cycle (called after Alex finishes speaking) ───
  const prepareNextListenCycle = useCallback(() => {
    finalTranscriptRef.current = "";
    clearSilenceTimer();
    if (!sessionRef.current) {
      safeSetState("idle");
      return;
    }
    safeSetState("relistening");
    console.log("[VoiceSession] stt_restarted (relistening)");
    setTimeout(() => {
      if (sessionRef.current && !isPlayingRef.current) {
        safeSetState("listening");
        startSTT();
      }
    }, RELISTEN_DELAY_MS);
  }, [clearSilenceTimer, safeSetState, startSTT]);

  // ─── Playback Queue ───
  const playNext = useCallback(() => {
    const token = playbackTokenRef.current;
    if (audioQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      currentAudioRef.current = null;
      console.log("[VoiceSession] tts_finished");
      // Use prepareNextListenCycle instead of direct startSTT
      if (sessionRef.current) {
        prepareNextListenCycle();
      } else {
        safeSetState("idle");
      }
      return;
    }
    isPlayingRef.current = true;
    safeSetState("speaking");
    const audio = audioQueueRef.current.shift()!;
    currentAudioRef.current = audio;
    audio.onended = () => {
      if (playbackTokenRef.current !== token) return;
      currentAudioRef.current = null;
      playNext();
    };
    audio.onerror = () => {
      if (playbackTokenRef.current !== token) return;
      currentAudioRef.current = null;
      playNext();
    };
    audio.play().catch(() => {
      if (playbackTokenRef.current !== token) return;
      currentAudioRef.current = null;
      playNext();
    });
  }, [prepareNextListenCycle, safeSetState]);

  const stopPlayback = useCallback(() => {
    playbackTokenRef.current++;
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.src = "";
      currentAudioRef.current = null;
    }
    audioQueueRef.current.forEach(a => { a.pause(); a.src = ""; });
    audioQueueRef.current = [];
    isPlayingRef.current = false;
  }, []);

  const enqueueAudio = useCallback((base64: string) => {
    // Stop STT when audio starts playing (echo protection)
    if (sttRunningRef.current) {
      stopSTT();
    }
    const audio = new Audio(`data:audio/mpeg;base64,${base64}`);
    audioQueueRef.current.push(audio);
    if (!isPlayingRef.current) {
      console.log("[VoiceSession] tts_started");
      playNext();
    }
  }, [playNext, stopSTT]);

  // ─── API Call ───
  const callVoice = useCallback(async (action: string, payload: Record<string, any> = {}) => {
    const controller = new AbortController();
    abortRef.current = controller;
    const auth = await getAuthInfo();
    const resp = await fetch(VOICE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${auth.accessToken}`,
      },
      body: JSON.stringify({ action, ...payload }),
      signal: controller.signal,
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ error: "Erreur" }));
      throw new Error(err.error || `Error ${resp.status}`);
    }
    return resp.json();
  }, []);

  // ─── Send user message via alex-voice ───
  const sendUserMessage = useCallback(async (text: string) => {
    if (!text.trim() || !sessionRef.current) return;
    stopPlayback();
    stopSTT();
    safeSetState("thinking");
    setIsStreaming(true);
    console.log("[VoiceSession] alex_thinking");

    const userMsg: Msg = { role: "user", content: text.trim() };
    const updated = [...messagesRef.current, userMsg];
    messagesRef.current = updated;
    setMessages([...updated]);

    try {
      const auth = await getAuthInfo();
      const data = await callVoice("respond-stream", {
        sessionId: sessionIdRef.current,
        userMessage: text.trim(),
        messages: updated.map(m => ({ role: m.role, content: m.content })),
        userName: auth.userName,
        context: {
          currentPage: window.location.pathname,
          isAuthenticated: auth.isAuthenticated,
        },
      });

      if (data.text) {
        const assistantMsg: Msg = { role: "assistant", content: data.text };
        const withAssistant = [...updated, assistantMsg];
        messagesRef.current = withAssistant;
        setMessages([...withAssistant]);
      }

      setIsStreaming(false);

      if (data.audioChunks?.length) {
        for (const chunk of data.audioChunks) enqueueAudio(chunk);
      } else if (data.audio) {
        enqueueAudio(data.audio);
      } else {
        // No audio — go straight to listening
        prepareNextListenCycle();
      }
    } catch (e: any) {
      setIsStreaming(false);
      if (e.name !== "AbortError") {
        console.error("[VoiceSession] Error:", e.message);
        // Recovery: go back to listening
        if (sessionRef.current) {
          console.log("[VoiceSession] recovery_started");
          prepareNextListenCycle();
          console.log("[VoiceSession] recovery_completed");
        }
      }
    }
  }, [callVoice, stopPlayback, stopSTT, enqueueAudio, safeSetState, prepareNextListenCycle]);

  // ─── STT Setup ───
  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { sttSupported.current = false; return; }
    sttSupported.current = true;

    const r = new SR();
    r.lang = "fr-CA";
    r.continuous = true;
    r.interimResults = true;

    r.onstart = () => {
      sttRunningRef.current = true;
    };

    r.onresult = (e: any) => {
      if (!sessionRef.current) return;
      // Barge-in: if user speaks while Alex is speaking, interrupt immediately
      if (isPlayingRef.current) {
        console.log("[VoiceSession] interrupt_received");
        stopPlayback();
        safeSetState("listening");
      }

      let interim = "";
      let final = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript;
        else interim += e.results[i][0].transcript;
      }

      if (final) {
        finalTranscriptRef.current += final;
        console.log("[VoiceSession] final_received:", final);
        clearSilenceTimer();
        silenceTimerRef.current = setTimeout(() => {
          const text = finalTranscriptRef.current.trim();
          if (text && sessionRef.current) {
            console.log("[VoiceSession] stt_finalized");
            finalTranscriptRef.current = "";
            stopSTT();
            sendUserMessage(text);
          }
        }, END_OF_SPEECH_SILENCE_MS);
      } else if (interim) {
        console.log("[VoiceSession] partial_received:", interim);
        clearSilenceTimer();
        silenceTimerRef.current = setTimeout(() => {
          const text = finalTranscriptRef.current.trim();
          if (text && sessionRef.current) {
            console.log("[VoiceSession] stt_finalized (from interim timeout)");
            finalTranscriptRef.current = "";
            stopSTT();
            sendUserMessage(text);
          }
        }, INTERIM_SILENCE_MS);
      }
    };

    r.onerror = (e: any) => {
      sttRunningRef.current = false;
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        safeSetState("idle");
        return;
      }
      // Recoverable error — restart after delay if still in listening state
      if (sessionRef.current && stateRef.current === "listening" && !isPlayingRef.current) {
        console.log("[VoiceSession] recovery_started (stt error:", e.error, ")");
        setTimeout(() => {
          if (sessionRef.current && stateRef.current === "listening" && !isPlayingRef.current && !sttRunningRef.current) {
            startSTT();
            console.log("[VoiceSession] recovery_completed");
          }
        }, RESTART_DELAY_MS);
      }
    };

    r.onend = () => {
      sttRunningRef.current = false;
      // Only restart if we're supposed to be listening and nothing else is happening
      if (sessionRef.current && stateRef.current === "listening" && !isPlayingRef.current) {
        setTimeout(() => {
          if (sessionRef.current && stateRef.current === "listening" && !isPlayingRef.current && !sttRunningRef.current) {
            startSTT();
          }
        }, RESTART_DELAY_MS);
      }
    };

    recRef.current = r;
  }, [safeSetState, stopPlayback, sendUserMessage, startSTT, stopSTT, clearSilenceTimer]);

  // ─── Open Session ───
  const openSession = useCallback(async (greetingText?: string) => {
    if (sessionRef.current) return;
    if (!sttSupported.current) { console.warn("[VoiceSession] STT not supported"); return; }

    sessionRef.current = true;
    setSessionActive(true);
    messagesRef.current = [];
    setMessages([]);
    safeSetState("thinking");
    console.log("[VoiceSession] session_start");

    try {
      const auth = await getAuthInfo();
      const data = await callVoice("create-session", {
        userId: auth.userId,
        userName: auth.userName,
        feature: "general",
        context: {
          currentPage: window.location.pathname,
          isAuthenticated: auth.isAuthenticated,
        },
      });

      sessionIdRef.current = data.sessionId;

      if (data.greeting) {
        const msg: Msg = { role: "assistant", content: data.greeting };
        messagesRef.current = [msg];
        setMessages([msg]);
      }

      if (data.greetingAudio) {
        enqueueAudio(data.greetingAudio);
      } else {
        prepareNextListenCycle();
      }
    } catch (e: any) {
      console.error("[VoiceSession] Session open error:", e.message);
      if (greetingText) {
        const msg: Msg = { role: "assistant", content: greetingText };
        messagesRef.current = [msg];
        setMessages([msg]);
      }
      prepareNextListenCycle();
    }
  }, [callVoice, enqueueAudio, safeSetState, prepareNextListenCycle]);

  // ─── Close Session ───
  const closeSession = useCallback(async () => {
    sessionRef.current = false;
    setSessionActive(false);
    stopSTT();
    stopPlayback();
    abortRef.current?.abort();
    safeSetState("idle");
    setIsStreaming(false);

    // Persist conversation
    if (sessionIdRef.current && messagesRef.current.length > 0) {
      const auth = await getAuthInfo();
      try {
        await fetch(VOICE_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${auth.accessToken}`,
          },
          body: JSON.stringify({
            action: "save-messages",
            sessionId: sessionIdRef.current,
            conversationMessages: messagesRef.current.map(m => ({ role: m.role, content: m.content })),
          }),
        });
      } catch { /* silent */ }
    }

    sessionIdRef.current = null;
    messagesRef.current = [];
    setMessages([]);
  }, [stopSTT, stopPlayback, safeSetState]);

  // ─── Mute / interrupt ───
  const muteSpeech = useCallback(() => {
    console.log("[VoiceSession] interrupt_received (manual)");
    stopPlayback();
    abortRef.current?.abort();
    setIsStreaming(false);
    if (sessionRef.current) {
      prepareNextListenCycle();
    }
  }, [stopPlayback, prepareNextListenCycle]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      sessionRef.current = false;
      stopSTT();
      stopPlayback();
      abortRef.current?.abort();
    };
  }, [stopSTT, stopPlayback]);

  return {
    state,
    sessionActive,
    messages,
    isStreaming,
    sttSupported: sttSupported.current,
    openSession,
    closeSession,
    muteSpeech,
    resetChat: useCallback(() => { messagesRef.current = []; setMessages([]); }, []),
    sendMessage: sendUserMessage,
  };
}
