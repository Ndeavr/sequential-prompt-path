/**
 * useAlexVoice — Production voice hook for Alex Voice Mode
 * 
 * Features:
 * - Web Speech API STT (fr-CA)
 * - Interrupt-safe playback queue
 * - Session management with Supabase
 * - UI action dispatch
 * - Context awareness
 * 
 * Also exports legacy API (isSpeaking, speak, stop) for backward compatibility.
 */
import { useState, useRef, useCallback, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";

const VOICE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/alex-voice`;
const TTS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`;

export type VoiceState = "idle" | "listening" | "thinking" | "speaking";

export type UIAction = {
  type: string;
  target?: string;
  items?: string;
};

type VoiceMessage = {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
};

interface UseAlexVoiceFullOptions {
  onUIAction?: (action: UIAction) => void;
  currentPage?: string;
  activeProperty?: string;
  hasScore?: boolean;
}

// ─── Full voice mode hook ───
export function useAlexVoiceFull(options?: UseAlexVoiceFullOptions) {
  const { session, isAuthenticated, role } = useAuth();
  const [state, setState] = useState<VoiceState>("idle");
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [transcript, setTranscript] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const audioQueueRef = useRef<HTMLAudioElement[]>([]);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const isPlayingRef = useRef(false);
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const abortRef = useRef<AbortController | null>(null);

  const userName = session?.user?.user_metadata?.full_name?.split(" ")[0]
    || session?.user?.user_metadata?.first_name
    || null;

  // ─── Audio Playback Queue ───
  const playNext = useCallback(() => {
    if (audioQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      currentAudioRef.current = null;
      setState(prev => prev === "speaking" ? "idle" : prev);
      return;
    }
    isPlayingRef.current = true;
    setState("speaking");
    const audio = audioQueueRef.current.shift()!;
    currentAudioRef.current = audio;
    audio.onended = () => { currentAudioRef.current = null; playNext(); };
    audio.onerror = () => { currentAudioRef.current = null; playNext(); };
    audio.play().catch(() => { currentAudioRef.current = null; playNext(); });
  }, []);

  const stopPlayback = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.src = "";
      currentAudioRef.current = null;
    }
    audioQueueRef.current.forEach(a => { a.pause(); a.src = ""; });
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    setState(prev => prev === "speaking" ? "idle" : prev);
  }, []);

  const enqueueAudio = useCallback((base64: string) => {
    const audio = new Audio(`data:audio/mpeg;base64,${base64}`);
    audioQueueRef.current.push(audio);
    if (!isPlayingRef.current) playNext();
  }, [playNext]);

  // ─── API Call ───
  const callVoice = useCallback(async (actionType: string, payload: Record<string, any> = {}) => {
    const controller = new AbortController();
    abortRef.current = controller;
    const response = await fetch(VOICE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ action: actionType, ...payload }),
      signal: controller.signal,
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: "Erreur" }));
      throw new Error(err.error || `Error ${response.status}`);
    }
    return response.json();
  }, [session]);

  // ─── Start Session ───
  const startSession = useCallback(async () => {
    try {
      setError(null);
      setState("thinking");
      const data = await callVoice("create-session", {
        userId: session?.user?.id || null,
        userName,
        feature: "general",
        context: { currentPage: optionsRef.current?.currentPage, isAuthenticated, userRole: role },
      });
      setSessionId(data.sessionId);
      if (data.greeting) {
        setMessages([{ role: "assistant", content: data.greeting, timestamp: Date.now() }]);
      }
      if (data.greetingAudio) {
        enqueueAudio(data.greetingAudio);
      } else {
        setState("idle");
      }
    } catch (e: any) {
      if (e.name !== "AbortError") { setError(e.message); setState("idle"); }
    }
  }, [callVoice, session, userName, isAuthenticated, role, enqueueAudio]);

  // ─── Send User Message ───
  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;
    stopPlayback();
    setError(null);
    setState("thinking");
    const userMsg: VoiceMessage = { role: "user", content: text.trim(), timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setTranscript("");

    try {
      const conversationHistory = messages.map(m => ({ role: m.role, content: m.content }));
      const data = await callVoice("respond-stream", {
        sessionId,
        userMessage: text.trim(),
        messages: conversationHistory,
        userName,
        context: {
          currentPage: optionsRef.current?.currentPage,
          activeProperty: optionsRef.current?.activeProperty,
          isAuthenticated,
          userRole: role,
          hasScore: optionsRef.current?.hasScore,
        },
      });

      if (data.text) {
        setMessages(prev => [...prev, { role: "assistant", content: data.text, timestamp: Date.now() }]);
      }
      if (data.uiActions?.length && optionsRef.current?.onUIAction) {
        for (const action of data.uiActions) optionsRef.current.onUIAction(action as UIAction);
      }
      if (data.audioChunks?.length) {
        for (const chunk of data.audioChunks) enqueueAudio(chunk);
      } else if (data.audio) {
        enqueueAudio(data.audio);
      } else {
        setState("idle");
      }
    } catch (e: any) {
      if (e.name !== "AbortError") { setError(e.message); setState("idle"); }
    }
  }, [callVoice, sessionId, messages, userName, isAuthenticated, role, stopPlayback, enqueueAudio]);

  // ─── Speech Recognition ───
  const startListening = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setError("Reconnaissance vocale non supportée."); return; }
    stopPlayback();

    const recognition = new SR();
    recognition.lang = "fr-CA";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (e: any) => {
      let interim = "";
      let final = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript;
        else interim += e.results[i][0].transcript;
      }
      if (final) { setTranscript(final); recognition.stop(); sendMessage(final); }
      else setTranscript(interim);
    };
    recognition.onerror = (e: any) => { if (e.error !== "aborted" && e.error !== "no-speech") console.error("Speech:", e.error); setState("idle"); };
    recognition.onend = () => { recognitionRef.current = null; };

    recognitionRef.current = recognition;
    recognition.start();
    setState("listening");
  }, [stopPlayback, sendMessage]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setState(prev => prev === "listening" ? "idle" : prev);
  }, []);

  const interrupt = useCallback(() => {
    stopPlayback();
    stopListening();
    abortRef.current?.abort();
    setState("idle");
  }, [stopPlayback, stopListening]);

  const reset = useCallback(() => {
    interrupt();
    setMessages([]);
    setSessionId(null);
    setTranscript("");
    setError(null);
  }, [interrupt]);

  useEffect(() => {
    return () => { stopPlayback(); recognitionRef.current?.stop(); abortRef.current?.abort(); };
  }, []);

  const isSupported = typeof window !== "undefined" &&
    !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  return {
    state, messages, transcript, sessionId, error, isSupported,
    startSession, sendMessage, startListening, stopListening, stopPlayback, interrupt, reset,
  };
}

// ─── Legacy API (backward compatible) ───
/** Split text into sentence-boundary chunks for streaming TTS */
function splitIntoChunks(text: string, maxLen: number): string[] {
  if (text.length <= maxLen) return [text];
  const chunks: string[] = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= maxLen) { chunks.push(remaining); break; }
    let splitIdx = -1;
    for (const sep of [". ", "! ", "? ", ".\n", "!\n", "?\n"]) {
      const idx = remaining.lastIndexOf(sep, maxLen);
      if (idx > splitIdx) splitIdx = idx + sep.length;
    }
    if (splitIdx <= 0) { splitIdx = remaining.lastIndexOf(" ", maxLen); if (splitIdx <= 0) splitIdx = maxLen; }
    chunks.push(remaining.slice(0, splitIdx).trim());
    remaining = remaining.slice(splitIdx).trim();
  }
  return chunks.filter(Boolean);
}

export const useAlexVoice = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentObjectUrlRef = useRef<string | null>(null);
  const queueRef = useRef<string[]>([]);
  const processingRef = useRef(false);
  const onDoneRef = useRef<(() => void) | null>(null);

  const cleanupObjectUrl = useCallback(() => {
    if (currentObjectUrlRef.current) { URL.revokeObjectURL(currentObjectUrlRef.current); currentObjectUrlRef.current = null; }
  }, []);

  const finishIfIdle = useCallback(() => {
    if (!processingRef.current && queueRef.current.length === 0) {
      setIsSpeaking(false);
      const done = onDoneRef.current;
      onDoneRef.current = null;
      done?.();
    }
  }, []);

  const processQueue = useCallback(async () => {
    if (processingRef.current) return;
    if (queueRef.current.length === 0) { finishIfIdle(); return; }
    processingRef.current = true;
    setIsSpeaking(true);
    const text = queueRef.current.shift()!;
    try {
      const response = await fetch(TTS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ text }),
      });
      if (!response.ok) { processingRef.current = false; queueMicrotask(() => processQueue()); return; }
      const blob = await response.blob();
      cleanupObjectUrl();
      const url = URL.createObjectURL(blob);
      currentObjectUrlRef.current = url;
      const audio = audioRef.current ?? new Audio();
      audioRef.current = audio;
      audio.src = url;
      audio.onended = () => { cleanupObjectUrl(); processingRef.current = false; queueMicrotask(() => processQueue()); };
      audio.onerror = () => { cleanupObjectUrl(); processingRef.current = false; queueMicrotask(() => processQueue()); };
      try { await audio.play(); } catch { cleanupObjectUrl(); processingRef.current = false; queueMicrotask(() => processQueue()); }
    } catch { cleanupObjectUrl(); processingRef.current = false; queueMicrotask(() => processQueue()); }
  }, [cleanupObjectUrl, finishIfIdle]);

  const speak = useCallback((text: string, onDone?: () => void) => {
    if (onDone) onDoneRef.current = onDone;
    const chunks = splitIntoChunks(text, 250);
    queueRef.current.push(...chunks);
    queueMicrotask(() => processQueue());
  }, [processQueue]);

  const stop = useCallback(() => {
    queueRef.current = [];
    processingRef.current = false;
    onDoneRef.current = null;
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.removeAttribute("src"); audioRef.current.load(); }
    cleanupObjectUrl();
    setIsSpeaking(false);
  }, [cleanupObjectUrl]);

  return { isSpeaking, speak, stop };
};
