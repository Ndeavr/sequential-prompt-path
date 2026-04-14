/**
 * useAlexVoiceBootstrap — Voice autostart engine for any Alex surface.
 * 
 * Enforces the strict boot sequence:
 * 1. Unlock audio context
 * 2. Play intro chime (wait for completion)
 * 3. Connect Gemini Live with greeting
 * 4. Alex speaks greeting
 * 5. Transition to listening
 * 
 * State machine: idle → permission_check → preloading → connecting → intro_playing → 
 *                alex_speaking → alex_listening → user_speaking → processing → 
 *                alex_speaking_response → session_error → session_closed
 * 
 * RULES:
 * - Single welcome per session
 * - Single control visible at a time
 * - Connection timeout → recovery
 * - Greeting BEFORE listening (never skip)
 */
import { useState, useCallback, useRef, useEffect } from "react";
import { useLiveVoice } from "@/hooks/useLiveVoice";
import { audioEngine } from "@/services/audioEngineUNPRO";
import { useAuth } from "@/hooks/useAuth";

export type VoiceBootState =
  | "idle"
  | "permission_check"
  | "preloading"
  | "connecting"
  | "intro_playing"
  | "alex_speaking"
  | "alex_listening"
  | "user_speaking"
  | "processing"
  | "alex_speaking_response"
  | "session_error"
  | "session_closed";

interface TranscriptEntry {
  id: string;
  role: "user" | "alex";
  text: string;
}

interface UseAlexVoiceBootstrapOptions {
  feature?: string;
  autoStart?: boolean;
}

const CONNECTION_TIMEOUT_MS = 8000;

export function useAlexVoiceBootstrap(options: UseAlexVoiceBootstrapOptions = {}) {
  const { feature = "general" } = options;
  const { user } = useAuth();
  const [bootState, setBootState] = useState<VoiceBootState>("idle");
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const entryIdRef = useRef(0);
  const lastAgentIdRef = useRef<string | null>(null);
  const greetingSentRef = useRef(false);
  const connectionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasReceivedAudioRef = useRef(false);

  const firstName = user?.user_metadata?.first_name 
    || user?.user_metadata?.full_name?.split(" ")[0] 
    || null;

  // Build greeting based on context
  const buildGreeting = useCallback(() => {
    const hour = new Date().getHours();
    const timeGreeting = hour >= 5 && hour < 12 ? "Bonjour" : hour < 18 ? "Bon après-midi" : "Bonsoir";
    const name = firstName ? `${timeGreeting} ${firstName}.` : `${timeGreeting}.`;

    switch (feature) {
      case "probleme":
        return `${name} Décrivez-moi votre problème, je m'en occupe.`;
      case "projet":
        return `${name} Un nouveau projet? Dites-moi de quoi il s'agit.`;
      case "avis":
        return `${name} Vous souhaitez que j'analyse vos soumissions? Décrivez-moi ce que vous avez reçu.`;
      case "conversation":
      case "general":
      default:
        return `${name} Que puis-je faire pour vous?`;
    }
  }, [firstName, feature]);

  const { start, stop, isActive, isConnecting, isSpeaking } = useLiveVoice({
    onTranscript: (text) => {
      hasReceivedAudioRef.current = true;
      
      // First audio from Alex = greeting done → update state
      if (bootState === "connecting" || bootState === "intro_playing") {
        setBootState("alex_speaking");
      }

      setTranscripts(prev => {
        const last = prev.length > 0 && prev[prev.length - 1].role === "alex"
          ? prev[prev.length - 1] : null;

        if (last && last.id === lastAgentIdRef.current) {
          return prev.map(e => e.id === last.id ? { ...e, text: e.text + text } : e);
        }

        const newId = `alex-${++entryIdRef.current}`;
        lastAgentIdRef.current = newId;
        return [...prev, { role: "alex", text, id: newId }];
      });
    },
    onUserTranscript: (text) => {
      if (!text || text.trim().length < 2) return;
      lastAgentIdRef.current = null;
      setBootState("user_speaking");
      setTranscripts(prev => [
        ...prev,
        { role: "user", text, id: `user-${++entryIdRef.current}` },
      ]);
    },
    onConnect: () => {
      // Clear timeout
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
      setBootState("alex_speaking");
    },
    onDisconnect: () => {
      setBootState("session_closed");
    },
    onError: (error) => {
      console.error("[VoiceBootstrap] Error:", error);
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
      setErrorMessage("Erreur de connexion vocale. Réessayez.");
      setBootState("session_error");
    },
  });

  // Sync speaking/listening states from Gemini
  useEffect(() => {
    if (!isActive) return;
    if (isSpeaking) {
      setBootState(prev => 
        prev === "alex_listening" || prev === "user_speaking" || prev === "processing" 
          ? "alex_speaking_response" 
          : prev === "alex_speaking" ? prev : "alex_speaking"
      );
    } else if (isActive && hasReceivedAudioRef.current) {
      setBootState(prev => 
        prev === "alex_speaking" || prev === "alex_speaking_response" 
          ? "alex_listening" 
          : prev
      );
    }
  }, [isSpeaking, isActive]);

  // ─── BOOT SEQUENCE ───
  const startVoice = useCallback(async () => {
    if (isActive || isConnecting || bootState === "connecting") return;
    
    greetingSentRef.current = false;
    hasReceivedAudioRef.current = false;
    setTranscripts([]);
    setErrorMessage(null);
    lastAgentIdRef.current = null;
    
    try {
      // 1. Unlock audio (no chime — chimes cause clicking/interference with ElevenLabs stream)
      setBootState("preloading");
      audioEngine.unlock();

      // 2. Connect directly — no intro sound to avoid audio interference
      setBootState("connecting");
      const greeting = buildGreeting();
      greetingSentRef.current = true;
      
      // Set connection timeout
      connectionTimeoutRef.current = setTimeout(() => {
        console.warn("[VoiceBootstrap] Connection timeout");
        setErrorMessage("La connexion prend trop de temps. Réessayez.");
        setBootState("session_error");
        stop();
      }, CONNECTION_TIMEOUT_MS);

      await start({ initialGreeting: greeting });
    } catch (err: any) {
      console.error("[VoiceBootstrap] Boot failed:", err);
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
      }
      
      if (err?.name === "NotAllowedError" || err?.message?.includes("Permission")) {
        setBootState("permission_check");
        setErrorMessage("Autorisez le microphone pour continuer.");
      } else {
        setBootState("session_error");
        setErrorMessage("Impossible de démarrer la voix. Réessayez.");
      }
    }
  }, [isActive, isConnecting, bootState, buildGreeting, start, stop]);

  const stopVoice = useCallback(() => {
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }
    // No outro chime — causes clicking artifacts on mobile
    stop();
    setBootState("session_closed");
  }, [stop]);

  const retryVoice = useCallback(() => {
    setBootState("idle");
    setErrorMessage(null);
    // Small delay then restart
    setTimeout(() => startVoice(), 200);
  }, [startVoice]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
      }
      stop();
    };
  }, [stop]);

  // Derive the single primary control to show
  const primaryControl: "start" | "stop" | "retry" | "permission" | "connecting" = 
    bootState === "session_error" ? "retry"
    : bootState === "permission_check" ? "permission"
    : bootState === "connecting" || bootState === "preloading" || bootState === "intro_playing" ? "connecting"
    : isActive ? "stop"
    : "start";

  // Derive status text
  const statusText =
    bootState === "intro_playing" ? "Préparation…"
    : bootState === "connecting" || bootState === "preloading" ? "Connexion…"
    : bootState === "alex_speaking" || bootState === "alex_speaking_response" ? "Alex parle…"
    : bootState === "alex_listening" ? "Je vous écoute…"
    : bootState === "user_speaking" ? "Vous parlez…"
    : bootState === "processing" ? "Réflexion…"
    : bootState === "session_error" ? "Erreur"
    : bootState === "permission_check" ? "Micro requis"
    : bootState === "session_closed" ? "Session terminée"
    : "Parler à Alex";

  return {
    bootState,
    transcripts,
    errorMessage,
    primaryControl,
    statusText,
    isActive,
    isSpeaking,
    isConnecting,
    startVoice,
    stopVoice,
    retryVoice,
  };
}
