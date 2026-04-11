/**
 * useLiveVoice — ElevenLabs Conversational AI voice hook.
 * 
 * Uses @elevenlabs/react useConversation for WebSocket-based
 * real-time voice conversation with an ElevenLabs agent.
 * 
 * NOTE: The French system prompt is configured directly on the
 * ElevenLabs agent dashboard (agent_5901kmg4ra2eee5bbp9r7ew5jcs7).
 * Do NOT pass overrides here — they cause instant disconnects
 * unless explicitly enabled in the ElevenLabs dashboard.
 */
import { useState, useRef, useCallback, useEffect } from "react";
import { useConversation } from "@elevenlabs/react";
import { supabase } from "@/integrations/supabase/client";
import { audioEngine } from "@/services/audioEngineUNPRO";

/** Cooldown (ms) after a disconnect before allowing reconnection */
const RECONNECT_COOLDOWN_MS = 5000;

interface UseLiveVoiceCallbacks {
  onTranscript?: (text: string) => void;
  onUserTranscript?: (text: string) => void;
  onFirstAudio?: () => void;
  onError?: (error: unknown) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export function useLiveVoice(callbacks?: UseLiveVoiceCallbacks) {
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;
  const intentionallyStopped = useRef(false);
  const hasDeliveredFirstAudioRef = useRef(false);
  const connectedAtRef = useRef<number>(0);
  const lastDisconnectAtRef = useRef<number>(0);

  const conversation = useConversation({
    onConnect: () => {
      console.log("[ElevenLabs] ✅ Connected to agent");
      connectedAtRef.current = Date.now();
      setIsActive(true);
      setIsConnecting(false);
      callbacksRef.current?.onConnect?.();
    },
    onDisconnect: () => {
      const sessionDuration = connectedAtRef.current ? Date.now() - connectedAtRef.current : 0;
      console.log(`[ElevenLabs] Disconnected from agent (session lasted ${sessionDuration}ms)`);
      lastDisconnectAtRef.current = Date.now();
      setIsActive(false);
      setIsConnecting(false);
      hasDeliveredFirstAudioRef.current = false;

      // Detect instant disconnect (< 2s) as a connection error
      if (sessionDuration > 0 && sessionDuration < 2000 && !intentionallyStopped.current) {
        console.error("[ElevenLabs] ⚠️ Instant disconnect detected — likely a config issue");
        callbacksRef.current?.onError?.(new Error("Session disconnected immediately — check agent config"));
        return;
      }

      if (!intentionallyStopped.current) {
        callbacksRef.current?.onDisconnect?.();
      }
    },
    onMessage: (message: any) => {
      const msgType = (message as any)?.type as string | undefined;

      if (msgType === "agent_response") {
        const text = (message as any)?.agent_response_event?.agent_response as string | undefined;
        if (text) {
          if (!hasDeliveredFirstAudioRef.current) {
            hasDeliveredFirstAudioRef.current = true;
            callbacksRef.current?.onFirstAudio?.();
          }
          callbacksRef.current?.onTranscript?.(text);
        }
      }

      if (msgType === "user_transcript") {
        const text = (message as any)?.user_transcription_event?.user_transcript as string | undefined;
        if (text && text.trim().length >= 2) {
          callbacksRef.current?.onUserTranscript?.(text);
        }
      }
    },
    onError: (error: unknown) => {
      console.error("[ElevenLabs] Error:", error);
      setIsConnecting(false);
      callbacksRef.current?.onError?.(error);
    },
  });

  const isSpeaking = conversation.isSpeaking;

  useEffect(() => {
    if (isSpeaking && !hasDeliveredFirstAudioRef.current) {
      hasDeliveredFirstAudioRef.current = true;
      callbacksRef.current?.onFirstAudio?.();
    }
  }, [isSpeaking]);

  useEffect(() => {
    const handleCleanup = () => {
      if (conversation.status === "connected") {
        console.log("[ElevenLabs] Received alex-voice-cleanup — stopping");
        conversation.endSession();
      }
    };
    window.addEventListener("alex-voice-cleanup", handleCleanup);
    return () => window.removeEventListener("alex-voice-cleanup", handleCleanup);
  }, [conversation]);

  const start = useCallback(async (options?: { initialGreeting?: string }) => {
    if (isActive || isConnecting) return;

    // Cooldown guard: prevent rapid reconnect loop
    const timeSinceLastDisconnect = Date.now() - lastDisconnectAtRef.current;
    if (lastDisconnectAtRef.current > 0 && timeSinceLastDisconnect < RECONNECT_COOLDOWN_MS) {
      console.warn(`[ElevenLabs] Reconnect blocked — cooldown (${timeSinceLastDisconnect}ms < ${RECONNECT_COOLDOWN_MS}ms)`);
      return;
    }

    intentionallyStopped.current = false;
    hasDeliveredFirstAudioRef.current = false;
    connectedAtRef.current = 0;
    setIsConnecting(true);

    try {
      console.log("[ElevenLabs] Requesting microphone...");
      await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log("[ElevenLabs] ✅ Microphone granted");

      // Get signed URL for WebSocket connection
      console.log("[ElevenLabs] Fetching signed URL...");
      const { data, error } = await supabase.functions.invoke("elevenlabs-conversation-token");

      if (error || !data?.signed_url) {
        throw new Error(error?.message || "Impossible d'obtenir l'URL de connexion");
      }
      console.log("[ElevenLabs] ✅ Got signed URL");

      // Connect with NO overrides — language configured on ElevenLabs dashboard
      await conversation.startSession({
        signedUrl: data.signed_url,
      });

      // Force French context — sendContextualUpdate injects context without triggering a visible response
      const conversationApi = conversation as any;
      if (typeof conversationApi.sendContextualUpdate === "function") {
        conversationApi.sendContextualUpdate(
          "INSTRUCTION ABSOLUE : Tu dois TOUJOURS répondre en français québécois naturel. Ne parle JAMAIS en anglais. Commence par saluer l'utilisateur en français."
        );
        console.log("[ElevenLabs] ✅ French context injected via sendContextualUpdate");
      } else if (typeof conversationApi.sendUserMessage === "function") {
        // Fallback: send as user message
        conversationApi.sendUserMessage(
          "Parle-moi en français québécois s'il te plaît."
        );
        console.log("[ElevenLabs] ✅ French-first greeting sent via sendUserMessage");
      } else {
        console.warn("[ElevenLabs] No method available to inject French context");
      }
    } catch (err: unknown) {
      console.error("[ElevenLabs] Failed to start:", err);
      setIsConnecting(false);
      callbacksRef.current?.onError?.(err);
    }
  }, [isActive, isConnecting, conversation]);

  const stop = useCallback(() => {
    intentionallyStopped.current = true;
    conversation.endSession();
    setIsActive(false);
    setIsConnecting(false);
    hasDeliveredFirstAudioRef.current = false;
    callbacksRef.current?.onDisconnect?.();
  }, [conversation]);

  return { start, stop, isActive, isConnecting, isSpeaking };
}
