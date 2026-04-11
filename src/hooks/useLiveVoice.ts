/**
 * useLiveVoice — ElevenLabs Conversational AI voice hook.
 * 
 * Uses @elevenlabs/react useConversation for WebRTC-based
 * real-time voice conversation with an ElevenLabs agent.
 * 
 * Keeps the same external API as the previous Gemini Live implementation
 * so overlay/bootstrap hooks work without changes.
 */
import { useState, useRef, useCallback, useEffect } from "react";
import { useConversation } from "@elevenlabs/react";
import { supabase } from "@/integrations/supabase/client";

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
      callbacksRef.current?.onConnect?.();
    },
    onDisconnect: () => {
      console.log("[ElevenLabs] Disconnected from agent");
      setIsActive(false);
      setIsConnecting(false);
      hasDeliveredFirstAudioRef.current = false;
      if (!intentionallyStopped.current) {
        callbacksRef.current?.onDisconnect?.();
      }
    },
    onMessage: (message: any) => {
      const msgType = (message as any)?.type as string | undefined;

      // Agent response text
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

      // User transcript
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

  // Track isSpeaking from the conversation hook
  const isSpeaking = conversation.isSpeaking;

  // Detect first audio from isSpeaking changing to true
  useEffect(() => {
    if (isSpeaking && !hasDeliveredFirstAudioRef.current) {
      hasDeliveredFirstAudioRef.current = true;
      callbacksRef.current?.onFirstAudio?.();
    }
  }, [isSpeaking]);

  // Listen for cleanup events
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
      // 1. Request microphone permission
      console.log("[ElevenLabs] Requesting microphone...");
      await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log("[ElevenLabs] ✅ Microphone granted");

      // 2. Connect directly to the public agent via WebRTC
      const agentId = "agent_5901kmg4ra2eee5bbp9r7ew5jcs7";
      console.log("[ElevenLabs] Connecting WebRTC to agent:", agentId);
      await conversation.startSession({
        agentId,
        connectionType: "webrtc",
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
