/**
 * useLiveVoice — ElevenLabs Conversational AI voice hook.
 * 
 * Uses @elevenlabs/react useConversation for WebSocket-based
 * real-time voice conversation with an ElevenLabs agent.
 */
import { useState, useRef, useCallback, useEffect } from "react";
import { useConversation } from "@elevenlabs/react";
import { supabase } from "@/integrations/supabase/client";
import { audioEngine } from "@/services/audioEngineUNPRO";

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

  const conversation = useConversation({
    onConnect: () => {
      console.log("[ElevenLabs] ✅ Connected to agent");
      setIsActive(true);
      setIsConnecting(false);
      audioEngine.play("success");
      callbacksRef.current?.onConnect?.();
    },
    onDisconnect: () => {
      console.log("[ElevenLabs] Disconnected from agent");
      setIsActive(false);
      setIsConnecting(false);
      hasDeliveredFirstAudioRef.current = false;
      if (!intentionallyStopped.current) {
        audioEngine.play("outro");
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

  const start = useCallback(async (_options?: { initialGreeting?: string }) => {
    if (isActive || isConnecting) return;

    intentionallyStopped.current = false;
    hasDeliveredFirstAudioRef.current = false;
    setIsConnecting(true);

    try {
      console.log("[ElevenLabs] Requesting microphone...");
      await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log("[ElevenLabs] ✅ Microphone granted");

      // Get signed URL for WebSocket connection (more compatible than WebRTC)
      console.log("[ElevenLabs] Fetching signed URL...");
      const { data, error } = await supabase.functions.invoke("elevenlabs-conversation-token");

      if (error || !data?.signed_url) {
        throw new Error(error?.message || "Impossible d'obtenir l'URL de connexion");
      }
      console.log("[ElevenLabs] ✅ Got signed URL");

      await conversation.startSession({
        signedUrl: data.signed_url,
      });

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
