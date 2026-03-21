/**
 * useAlexVoiceWs — WebSocket-based voice hook for Alex Voice.
 *
 * Connects to the ws-voice edge function for real-time voice interaction.
 * Supports push-to-talk, instant interruption, and audio playback queue.
 */
import { useState, useRef, useCallback, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";

export type VoiceState = "idle" | "listening" | "thinking" | "speaking";

export interface UIAction {
  type: string;
  target?: string;
  items?: string;
  [key: string]: string | undefined;
}

interface UseAlexVoiceWsOptions {
  onUIAction?: (action: UIAction) => void;
  currentPage?: string;
  activeProperty?: string;
  hasScore?: boolean;
  autoConnect?: boolean;
}

export function useAlexVoiceWs(options?: UseAlexVoiceWsOptions) {
  const { session, isAuthenticated, role } = useAuth();

  const [connected, setConnected] = useState(false);
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [partialTranscript, setPartialTranscript] = useState("");
  const [finalTranscript, setFinalTranscript] = useState("");
  const [alexText, setAlexText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const recognitionRef = useRef<any>(null);
  const audioQueueRef = useRef<HTMLAudioElement[]>([]);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const isPlayingRef = useRef(false);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const userName =
    session?.user?.user_metadata?.full_name?.split(" ")[0] ||
    session?.user?.user_metadata?.first_name ||
    null;

  // ─── WebSocket send ───
  const wsSend = useCallback((msg: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  // ─── Audio playback queue ───
  const playNext = useCallback(() => {
    if (audioQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      currentAudioRef.current = null;
      return;
    }
    isPlayingRef.current = true;
    const audio = audioQueueRef.current.shift()!;
    currentAudioRef.current = audio;
    audio.onended = () => {
      currentAudioRef.current = null;
      playNext();
    };
    audio.onerror = () => {
      currentAudioRef.current = null;
      playNext();
    };
    audio.play().catch(() => {
      currentAudioRef.current = null;
      playNext();
    });
  }, []);

  const stopPlayback = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.src = "";
      currentAudioRef.current = null;
    }
    audioQueueRef.current.forEach((a) => {
      a.pause();
      a.src = "";
    });
    audioQueueRef.current = [];
    isPlayingRef.current = false;
  }, []);

  const enqueueAudio = useCallback(
    (base64: string) => {
      const audio = new Audio(`data:audio/mpeg;base64,${base64}`);
      audioQueueRef.current.push(audio);
      if (!isPlayingRef.current) playNext();
    },
    [playNext]
  );

  // ─── Handle incoming WS messages ───
  const handleMessage = useCallback(
    (event: MessageEvent) => {
      let msg: any;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }

      switch (msg.type) {
        case "session.ready":
          setSessionId(msg.sessionId);
          setAlexText(msg.greeting || "");
          if (msg.greetingAudio) enqueueAudio(msg.greetingAudio);
          break;

        case "state.change":
          setVoiceState(msg.state as VoiceState);
          break;

        case "transcript.partial":
          setPartialTranscript(msg.text || "");
          break;

        case "transcript.final":
          setFinalTranscript(msg.text || "");
          setPartialTranscript("");
          break;

        case "response.text":
          setAlexText(msg.text || "");
          if (msg.uiActions?.length && optionsRef.current?.onUIAction) {
            for (const action of msg.uiActions) {
              optionsRef.current.onUIAction(action as UIAction);
            }
          }
          break;

        case "response.audio":
          if (msg.chunk) enqueueAudio(msg.chunk);
          break;

        case "response.done":
          // Audio queue will naturally finish
          break;

        case "interrupt.ack":
          setVoiceState("listening");
          break;

        case "audio.chunk.ack":
          // Acknowledged
          break;

        case "error":
          setError(msg.message || "Erreur inconnue");
          break;
      }
    },
    [enqueueAudio]
  );

  // ─── Connect WebSocket ───
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
    const wsUrl = supabaseUrl
      .replace("https://", "wss://")
      .replace("http://", "ws://");

    const ws = new WebSocket(`${wsUrl}/functions/v1/ws-voice`);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      setError(null);

      // Start session immediately
      wsSend({
        type: "session.start",
        userId: session?.user?.id || null,
        userName,
        context: {
          currentPage: optionsRef.current?.currentPage,
          activeProperty: optionsRef.current?.activeProperty,
          isAuthenticated,
          userRole: role,
          hasScore: optionsRef.current?.hasScore,
        },
      });
    };

    ws.onmessage = handleMessage;

    ws.onclose = () => {
      setConnected(false);
      wsRef.current = null;
    };

    ws.onerror = () => {
      setError("Connexion WebSocket échouée");
      setConnected(false);
    };
  }, [session, userName, isAuthenticated, role, wsSend, handleMessage]);

  // ─── Disconnect ───
  const disconnect = useCallback(() => {
    stopPlayback();
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    wsRef.current?.close();
    wsRef.current = null;
    setConnected(false);
    setVoiceState("idle");
    setSessionId(null);
  }, [stopPlayback]);

  // ─── Start listening (push-to-talk) ───
  const startListening = useCallback(() => {
    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SR) {
      setError("Reconnaissance vocale non supportée.");
      return;
    }

    // Interrupt if speaking
    if (voiceState === "speaking") {
      stopPlayback();
      wsSend({ type: "interrupt" });
    }

    setPartialTranscript("");
    setFinalTranscript("");

    const recognition = new SR();
    recognition.lang = "fr-CA";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (e: any) => {
      let interim = "";
      let finalText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalText += e.results[i][0].transcript;
        else interim += e.results[i][0].transcript;
      }

      if (finalText) {
        setFinalTranscript(finalText);
        setPartialTranscript("");
        recognition.stop();
        // Send to backend via WS
        wsSend({ type: "audio.stop", transcript: finalText });
      } else {
        setPartialTranscript(interim);
      }
    };

    recognition.onerror = (e: any) => {
      if (e.error !== "aborted" && e.error !== "no-speech") {
        console.error("Speech error:", e.error);
      }
    };

    recognition.onend = () => {
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
    setVoiceState("listening");
    wsSend({ type: "audio.stop" }); // Notify we're in listening mode
  }, [voiceState, stopPlayback, wsSend]);

  // ─── Stop listening ───
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    if (voiceState === "listening") {
      setVoiceState("idle");
    }
  }, [voiceState]);

  // ─── Interrupt Alex ───
  const interruptAlex = useCallback(() => {
    stopPlayback();
    stopListening();
    wsSend({ type: "interrupt" });
    setVoiceState("idle");
  }, [stopPlayback, stopListening, wsSend]);

  // ─── Clear error ───
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // ─── Auto-connect ───
  useEffect(() => {
    if (options?.autoConnect) {
      connect();
    }
    return () => {
      disconnect();
    };
  }, []);

  const isSupported =
    typeof window !== "undefined" &&
    !!((window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition);

  return {
    // State
    connected,
    voiceState,
    partialTranscript,
    finalTranscript,
    alexText,
    error,
    sessionId,
    isSupported,

    // Actions
    connect,
    disconnect,
    startListening,
    stopListening,
    interruptAlex,
    clearError,
  };
}
