/**
 * useAlexConversation — Manages message exchange with Alex backend.
 * Streaming responses, intent detection, next action resolution.
 */
import { useState, useCallback, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import type { AlexStep } from "@/hooks/useAlexSession";

const FUNCTIONS_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

export interface AlexMessage {
  id: string;
  role: "user" | "alex" | "system";
  content: string;
  timestamp: number;
}

export interface AlexNextAction {
  type: string;
  label: string;
  requires_auth: boolean;
  requires_contact: boolean;
}

export interface AlexTurnResult {
  alexResponse: string;
  detectedIntent?: string;
  bookingReadiness?: number;
  nextAction?: AlexNextAction;
  primaryMatch?: any;
  uiActions?: any[];
  fallbackState?: any;
}

interface UseAlexConversationOptions {
  sessionToken: string;
  onStepChange?: (step: AlexStep) => void;
  onChunk?: (chunk: string) => void;
}

export function useAlexConversation({ sessionToken, onStepChange, onChunk }: UseAlexConversationOptions) {
  const { session } = useAuth();
  const [messages, setMessages] = useState<AlexMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastIntent, setLastIntent] = useState<string | null>(null);
  const [nextAction, setNextAction] = useState<AlexNextAction | null>(null);
  const [bookingReadiness, setBookingReadiness] = useState(0);
  const [primaryMatch, setPrimaryMatch] = useState<any>(null);
  const idRef = useRef(0);

  const getToken = useCallback(() => {
    return session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  }, [session]);

  const addMessage = useCallback((role: AlexMessage["role"], content: string): AlexMessage => {
    const msg: AlexMessage = {
      id: `${role}-${++idRef.current}`,
      role,
      content,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, msg]);
    return msg;
  }, []);

  const addGreeting = useCallback((greeting: string) => {
    addMessage("alex", greeting);
  }, [addMessage]);

  const sendMessage = useCallback(async (
    text: string,
    mode: "text" | "voice" = "text",
    uiContext?: any,
  ): Promise<AlexTurnResult | null> => {
    if (isProcessing || !text.trim()) return null;

    setIsProcessing(true);
    onStepChange?.("thinking");
    addMessage("user", text);

    try {
      const resp = await fetch(`${FUNCTIONS_BASE}/alex-process-turn`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          session_token: sessionToken,
          session_id: sessionToken,
          user_message: text,
          message_mode: mode,
          ui_context: uiContext,
        }),
      });

      const data = await resp.json();

      // Build alex response from chunks or single response
      const alexText = Array.isArray(data.alex_response_chunks)
        ? data.alex_response_chunks.join("")
        : data.alex_response || data.greeting || "Je regarde ça.";

      // Stream-simulate the response
      onStepChange?.("speaking");
      addMessage("alex", alexText);

      if (data.detected_intent) setLastIntent(data.detected_intent);
      if (data.booking_readiness_score != null) setBookingReadiness(data.booking_readiness_score);
      if (data.next_action) setNextAction(data.next_action);
      if (data.primary_match) setPrimaryMatch(data.primary_match);

      onStepChange?.("listening");

      return {
        alexResponse: alexText,
        detectedIntent: data.detected_intent,
        bookingReadiness: data.booking_readiness_score,
        nextAction: data.next_action,
        primaryMatch: data.primary_match,
        uiActions: data.ui_actions,
        fallbackState: data.fallback_state,
      };
    } catch (err) {
      console.error("[useAlexConversation] sendMessage error:", err);
      addMessage("alex", "Désolé, une erreur est survenue. Réessayez.");
      onStepChange?.("error");
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, sessionToken, getToken, onStepChange, addMessage]);

  const reset = useCallback(() => {
    setMessages([]);
    setLastIntent(null);
    setNextAction(null);
    setBookingReadiness(0);
    setPrimaryMatch(null);
  }, []);

  return {
    messages,
    isProcessing,
    lastIntent,
    nextAction,
    bookingReadiness,
    primaryMatch,
    sendMessage,
    addGreeting,
    reset,
  };
}
