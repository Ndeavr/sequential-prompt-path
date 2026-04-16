/**
 * useAlexSilenceControl — Strict silence detection, 1 prompt max, pause, resume.
 *
 * RULES:
 * - 1 presence prompt per idle cycle: "Are you still there?"
 * - 1 final phrase: "Don't worry, I'll be here if you need me."
 * - Then: stop speaking, stop listening, pause session, persist snapshot.
 * - Resume only on explicit orb click.
 * - New cycle resets counters.
 */
import { useState, useRef, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AlexSilenceStatus =
  | "active"
  | "awaiting_user"
  | "idle_prompted"
  | "pausing"
  | "paused"
  | "resuming";

export interface AlexSilenceSnapshot {
  routePath: string;
  lastAlexMessage: string;
  lastUserMessage: string;
  collectedEntities: Record<string, unknown>;
  currentIntent: string;
  currentStepKey: string;
  uiState: Record<string, unknown>;
  activeFormState: Record<string, unknown>;
}

interface SilenceControlConfig {
  /** Ms before first presence prompt (default 15s) */
  idleThresholdMs?: number;
  /** Ms after presence prompt before final phrase (default 12s) */
  finalThresholdMs?: number;
  /** Callback to make Alex say the presence prompt */
  onPresencePrompt?: (text: string) => void;
  /** Callback to make Alex say the final phrase */
  onFinalPhrase?: (text: string) => void;
  /** Callback when session is paused — stop mic, stop TTS */
  onPause?: () => void;
  /** Callback when session resumes from orb */
  onResume?: (snapshot: AlexSilenceSnapshot | null) => void;
  /** Language */
  language?: "fr" | "en";
  /** DB session ID for persistence */
  sessionId?: string | null;
}

const PROMPTS = {
  fr: {
    presence: "Êtes-vous toujours là ?",
    final: "Pas de souci, je serai là si vous avez besoin de moi.",
  },
  en: {
    presence: "Are you still there?",
    final: "Don't worry, I'll be here if you need me.",
  },
};

export function useAlexSilenceControl(config: SilenceControlConfig = {}) {
  const {
    idleThresholdMs = 15_000,
    finalThresholdMs = 12_000,
    onPresencePrompt,
    onFinalPhrase,
    onPause,
    onResume,
    language = "fr",
    sessionId,
  } = config;

  const [status, setStatus] = useState<AlexSilenceStatus>("active");
  const [silenceCycle, setSilenceCycle] = useState(0);
  const [snapshot, setSnapshot] = useState<AlexSilenceSnapshot | null>(null);

  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finalTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const presenceSentRef = useRef(false);
  const finalSentRef = useRef(false);
  const mountedRef = useRef(true);

  const prompts = PROMPTS[language];

  const clearTimers = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (finalTimerRef.current) clearTimeout(finalTimerRef.current);
    idleTimerRef.current = null;
    finalTimerRef.current = null;
  }, []);

  // Log presence event to DB
  const logEvent = useCallback(
    (eventType: string, metadata?: Record<string, unknown>) => {
      if (!sessionId) return;
      supabase
        .from("alex_conversation_presence_events" as any)
        .insert({ session_id: sessionId, event_type: eventType, metadata: metadata || {} } as any)
        .then(() => {});
    },
    [sessionId]
  );

  // Start idle detection cycle
  const startIdleTimer = useCallback(() => {
    clearTimers();
    presenceSentRef.current = false;
    finalSentRef.current = false;

    idleTimerRef.current = setTimeout(() => {
      if (!mountedRef.current) return;

      // GUARDRAIL: Only 1 presence prompt per cycle
      if (presenceSentRef.current) return;
      presenceSentRef.current = true;

      setStatus("idle_prompted");
      logEvent("idle_detected");
      logEvent("presence_prompt_sent");
      onPresencePrompt?.(prompts.presence);

      // Start final timer
      finalTimerRef.current = setTimeout(() => {
        if (!mountedRef.current) return;

        // GUARDRAIL: Only 1 final phrase per cycle
        if (finalSentRef.current) return;
        finalSentRef.current = true;

        setStatus("pausing");
        logEvent("final_prompt_sent");
        onFinalPhrase?.(prompts.final);

        // After a brief delay for TTS to finish, execute full pause
        setTimeout(() => {
          if (!mountedRef.current) return;
          executePause();
        }, 3000);
      }, finalThresholdMs);
    }, idleThresholdMs);
  }, [idleThresholdMs, finalThresholdMs, onPresencePrompt, onFinalPhrase, prompts, logEvent, clearTimers]);

  // Full pause: stop everything, persist snapshot
  const executePause = useCallback(() => {
    clearTimers();
    setStatus("paused");
    setSilenceCycle((c) => c + 1);
    logEvent("session_paused");

    // Persist session status
    if (sessionId) {
      supabase
        .from("alex_conversation_sessions")
        .update({
          session_status: "paused",
          paused_at: new Date().toISOString(),
          silence_cycle_count: silenceCycle + 1,
        })
        .eq("id", sessionId)
        .then(() => {});
    }

    onPause?.();
  }, [sessionId, silenceCycle, logEvent, clearTimers, onPause]);

  /** Call on every user activity (message, click, voice, keypress) */
  const recordActivity = useCallback(() => {
    clearTimers();
    presenceSentRef.current = false;
    finalSentRef.current = false;

    if (status === "idle_prompted" || status === "awaiting_user") {
      setStatus("active");
    }
    if (status !== "paused" && status !== "pausing" && status !== "resuming") {
      setStatus("active");
      startIdleTimer();
    }

    // Update last activity in DB
    if (sessionId) {
      supabase
        .from("alex_conversation_sessions")
        .update({ last_user_activity_at: new Date().toISOString() })
        .eq("id", sessionId)
        .then(() => {});
    }
  }, [status, sessionId, clearTimers, startIdleTimer]);

  /** Persist snapshot for resume */
  const persistSnapshot = useCallback(
    (snap: AlexSilenceSnapshot) => {
      setSnapshot(snap);
      if (!sessionId) return;
      supabase
        .from("alex_resume_snapshots" as any)
        .insert({
          session_id: sessionId,
          route_path: snap.routePath,
          last_alex_message: snap.lastAlexMessage,
          last_user_message: snap.lastUserMessage,
          collected_entities: snap.collectedEntities,
          current_intent: snap.currentIntent,
          current_step_key: snap.currentStepKey,
          ui_state: snap.uiState,
          active_form_state: snap.activeFormState,
        } as any)
        .then(() => {});
    },
    [sessionId]
  );

  /** Resume from orb click — restores exact context */
  const resumeFromOrb = useCallback(async () => {
    setStatus("resuming");
    logEvent("session_resumed");

    let restoredSnapshot: AlexSilenceSnapshot | null = snapshot;

    // Try to fetch from DB if not in memory
    if (!restoredSnapshot && sessionId) {
      const { data } = await supabase
        .from("alex_resume_snapshots")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (data) {
        restoredSnapshot = {
          routePath: data.route_path || "",
          lastAlexMessage: data.last_alex_message || "",
          lastUserMessage: data.last_user_message || "",
          collectedEntities: (data.collected_entities as Record<string, unknown>) || {},
          currentIntent: data.current_intent || "",
          currentStepKey: data.current_step_key || "",
          uiState: (data.ui_state as Record<string, unknown>) || {},
          activeFormState: (data.active_form_state as Record<string, unknown>) || {},
        };
      }
    }

    // Update DB
    if (sessionId) {
      supabase
        .from("alex_conversation_sessions")
        .update({
          session_status: "active",
          resumed_at: new Date().toISOString(),
        })
        .eq("id", sessionId)
        .then(() => {});
    }

    // Reset cycle for new idle detection
    presenceSentRef.current = false;
    finalSentRef.current = false;
    setStatus("active");
    startIdleTimer();

    onResume?.(restoredSnapshot);
  }, [snapshot, sessionId, logEvent, startIdleTimer, onResume]);

  /** Start monitoring (call once on session open) */
  const startMonitoring = useCallback(() => {
    setStatus("active");
    presenceSentRef.current = false;
    finalSentRef.current = false;
    setSilenceCycle(0);
    startIdleTimer();
  }, [startIdleTimer]);

  /** Force close (user explicitly closes) */
  const forceClose = useCallback(() => {
    clearTimers();
    setStatus("paused");
  }, [clearTimers]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearTimers();
    };
  }, [clearTimers]);

  return {
    status,
    silenceCycle,
    snapshot,
    recordActivity,
    persistSnapshot,
    resumeFromOrb,
    startMonitoring,
    forceClose,
    isPaused: status === "paused",
    isIdle: status === "idle_prompted",
  };
}
