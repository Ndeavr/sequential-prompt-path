/**
 * useAlexSession — Manages Alex runtime session lifecycle.
 * Handles session creation, state tracking, and auth resume.
 */
import { useState, useCallback, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const FUNCTIONS_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

export type AlexStep =
  | "idle"
  | "listening"
  | "thinking"
  | "predicting"
  | "matching"
  | "preparing_booking"
  | "speaking"
  | "opening_calendar"
  | "waiting_input"
  | "objection_handling"
  | "auth_resume"
  | "no_result_recovery"
  | "success"
  | "error";

export interface AlexSessionState {
  sessionId: string | null;
  sessionToken: string;
  authState: "guest" | "authenticated";
  currentStep: AlexStep;
  greeting: string | null;
  voiceConfig: Record<string, any> | null;
  isResumed: boolean;
}

export function useAlexSession() {
  const { session, isAuthenticated } = useAuth();
  const tokenRef = useRef(crypto.randomUUID());

  const [state, setState] = useState<AlexSessionState>({
    sessionId: null,
    sessionToken: tokenRef.current,
    authState: "guest",
    currentStep: "idle",
    greeting: null,
    voiceConfig: null,
    isResumed: false,
  });
  const [isStarting, setIsStarting] = useState(false);

  const getToken = useCallback(() => {
    return session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  }, [session]);

  const startSession = useCallback(async (entrypoint = "voice") => {
    if (isStarting) return state;
    setIsStarting(true);

    try {
      const resp = await fetch(`${FUNCTIONS_BASE}/alex-start-session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          session_token: tokenRef.current,
          user_id: session?.user?.id || null,
          entrypoint,
        }),
      });

      const data = await resp.json();

      const newState: AlexSessionState = {
        sessionId: data.session_id,
        sessionToken: data.session_token || tokenRef.current,
        authState: data.auth_state || (isAuthenticated ? "authenticated" : "guest"),
        currentStep: data.current_step || "listening",
        greeting: data.greeting || "Oui, je vous écoute.",
        voiceConfig: data.voice_config || null,
        isResumed: data.resumed || false,
      };

      setState(newState);
      return newState;
    } catch (err) {
      console.error("[useAlexSession] startSession error:", err);
      setState(prev => ({ ...prev, currentStep: "error" }));
      return state;
    } finally {
      setIsStarting(false);
    }
  }, [isStarting, getToken, session, isAuthenticated, state]);

  const setStep = useCallback((step: AlexStep) => {
    setState(prev => ({ ...prev, currentStep: step }));
  }, []);

  const resumeAfterAuth = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      const resp = await fetch(`${FUNCTIONS_BASE}/alex-resume-after-auth`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          session_token: tokenRef.current,
          user_id: session.user.id,
        }),
      });

      const data = await resp.json();
      if (data.restored_session) {
        setState(prev => ({
          ...prev,
          authState: "authenticated",
          currentStep: data.next_action?.type === "open_calendar" ? "opening_calendar" : "listening",
          isResumed: true,
        }));
      }
      return data;
    } catch (err) {
      console.error("[useAlexSession] resumeAfterAuth error:", err);
    }
  }, [session, getToken]);

  return {
    ...state,
    isStarting,
    startSession,
    setStep,
    resumeAfterAuth,
  };
}
