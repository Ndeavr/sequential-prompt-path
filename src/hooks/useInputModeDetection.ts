/**
 * useInputModeDetection — Detects voice availability, user resistance,
 * and manages adaptive fallback: voice → chat → form.
 */
import { useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export type InputMode = "voice" | "chat" | "form";

interface InputModeState {
  activeMode: InputMode;
  voiceAvailable: boolean;
  voiceChecked: boolean;
  resistanceDetected: boolean;
  chatFailed: boolean;
  silenceCount: number;
  sessionId: string;
}

export function useInputModeDetection(sessionId?: string) {
  const sid = useRef(sessionId || crypto.randomUUID()).current;
  const startTime = useRef(Date.now());

  const [state, setState] = useState<InputModeState>({
    activeMode: "voice",
    voiceAvailable: false,
    voiceChecked: false,
    resistanceDetected: false,
    chatFailed: false,
    silenceCount: 0,
    sessionId: sid,
  });

  // Check microphone availability
  const checkVoice = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasMic = devices.some((d) => d.kind === "audioinput");

      if (hasMic) {
        // Try to get permission
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop());
        setState((s) => ({ ...s, voiceAvailable: true, voiceChecked: true }));
        return true;
      } else {
        setState((s) => ({
          ...s,
          voiceAvailable: false,
          voiceChecked: true,
          activeMode: "chat",
        }));
        logFailure("voice", "no_microphone");
        return false;
      }
    } catch {
      setState((s) => ({
        ...s,
        voiceAvailable: false,
        voiceChecked: true,
        activeMode: "chat",
      }));
      logFailure("voice", "permission_denied");
      return false;
    }
  }, []);

  // Log failure
  const logFailure = useCallback(
    async (mode: "voice" | "chat", reason: string) => {
      try {
        await supabase.from("input_mode_failures").insert({
          session_id: sid,
          failed_mode: mode,
          reason,
        });
      } catch {}
    },
    [sid]
  );

  // Log mode usage
  const logModeUsage = useCallback(
    async (mode: InputMode, success: boolean, conversion = false) => {
      try {
        await supabase.from("user_input_mode_logs").insert({
          session_id: sid,
          mode_used: mode,
          success,
          conversion,
          time_to_first_input_ms: Date.now() - startTime.current,
          page_context: window.location.pathname,
        });
      } catch {}
    },
    [sid]
  );

  // Switch mode
  const switchMode = useCallback(
    (newMode: InputMode) => {
      setState((s) => ({ ...s, activeMode: newMode }));
    },
    []
  );

  // Register silence (user opened voice but didn't speak)
  const registerSilence = useCallback(() => {
    setState((s) => {
      const newCount = s.silenceCount + 1;
      if (newCount >= 2) {
        logFailure("voice", "user_silence_repeated");
        return { ...s, silenceCount: newCount, resistanceDetected: true, activeMode: "chat" };
      }
      return { ...s, silenceCount: newCount };
    });
  }, [logFailure]);

  // Register voice dismiss
  const registerVoiceDismiss = useCallback(() => {
    setState((s) => ({ ...s, resistanceDetected: true, activeMode: "chat" }));
    logFailure("voice", "user_dismissed");
  }, [logFailure]);

  // Register chat failure
  const registerChatFailure = useCallback(
    (reason = "no_response") => {
      setState((s) => ({ ...s, chatFailed: true, activeMode: "form" }));
      logFailure("chat", reason);
    },
    [logFailure]
  );

  // Fallback to form explicitly
  const fallbackToForm = useCallback(() => {
    setState((s) => ({ ...s, activeMode: "form" }));
  }, []);

  // Auto-check voice on mount
  useEffect(() => {
    if (!state.voiceChecked) {
      checkVoice();
    }
  }, [checkVoice, state.voiceChecked]);

  return {
    ...state,
    checkVoice,
    switchMode,
    registerSilence,
    registerVoiceDismiss,
    registerChatFailure,
    fallbackToForm,
    logModeUsage,
  };
}
