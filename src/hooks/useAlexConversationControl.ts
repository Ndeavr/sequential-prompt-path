/**
 * useAlexConversationControl — Silence detection, auto-close, identity guardrails.
 * 
 * Rules:
 * - Max 2 reminders after silence
 * - Auto-close after 2nd reminder + 5s
 * - Never say "not responding"
 * - Identity: "Alex, l'assistant IA d'UNPRO"
 */
import { useState, useEffect, useRef, useCallback } from "react";

export type ConversationStatus =
  | "active"
  | "idle"
  | "closing"
  | "closed"
  | "abandoned";

export type TerminalReason =
  | "booked"
  | "recommended"
  | "summary"
  | "thanks"
  | "goodbye"
  | "manual";

interface ConversationControlConfig {
  silenceThreshold1Ms?: number; // 15s default
  silenceThreshold2Ms?: number; // 30s default
  autoCloseDelayMs?: number;   // 5s after 2nd reminder
  onReminder1?: () => void;
  onReminder2?: () => void;
  onAutoClose?: () => void;
  onStatusChange?: (status: ConversationStatus) => void;
}

// Two-attempt ladder per UNPRO production rules.
// #1 = compassionate presence check, #2 = soft close, then STOP.
const REMINDER_1_FR = "Êtes-vous toujours là ?";
const REMINDER_2_FR =
  "Je vais fermer cette conversation pour le moment. Revenez quand vous voulez.";
const REMINDER_1_EN = "Are you still there?";
const REMINDER_2_EN =
  "I'll close this conversation for now. Come back whenever you'd like.";

export function getReminders(lang: "fr" | "en" = "fr") {
  return lang === "fr"
    ? { reminder1: REMINDER_1_FR, reminder2: REMINDER_2_FR }
    : { reminder1: REMINDER_1_EN, reminder2: REMINDER_2_EN };
}

export function useAlexConversationControl(config: ConversationControlConfig = {}) {
  const {
    silenceThreshold1Ms = 15_000,
    silenceThreshold2Ms = 30_000,
    autoCloseDelayMs = 5_000,
    onReminder1,
    onReminder2,
    onAutoClose,
    onStatusChange,
  } = config;

  const [status, setStatus] = useState<ConversationStatus>("active");
  const [silenceCount, setSilenceCount] = useState(0);
  const lastActivityRef = useRef(Date.now());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateStatus = useCallback((s: ConversationStatus) => {
    setStatus(s);
    onStatusChange?.(s);
  }, [onStatusChange]);

  const clearTimers = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
  }, []);

  /** Call on every user interaction (message, click, voice) */
  const recordActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    clearTimers();
    setSilenceCount(0);
    if (status === "idle" || status === "closing") {
      updateStatus("active");
    }
    startSilenceTimer();
  }, [status]);

  const startSilenceTimer = useCallback(() => {
    clearTimers();
    // ALEX FEMALE-ONLY: a single calm reminder, then passive listening forever.
    // No second nag, no auto-close — Alex never says "êtes-vous encore là?".
    timerRef.current = setTimeout(() => {
      setSilenceCount((prev) => {
        const next = prev + 1;
        if (next === 1) {
          updateStatus("idle");
          onReminder1?.();
        }
        return next;
      });
    }, silenceThreshold1Ms);
  }, [silenceThreshold1Ms, onReminder1]);

  /** Start monitoring */
  const startSession = useCallback(() => {
    updateStatus("active");
    setSilenceCount(0);
    lastActivityRef.current = Date.now();
    startSilenceTimer();
  }, [startSilenceTimer]);

  /** Force close */
  const closeSession = useCallback(() => {
    clearTimers();
    updateStatus("closed");
  }, [clearTimers]);

  /** Reset for new session */
  const resetSession = useCallback(() => {
    clearTimers();
    setSilenceCount(0);
    updateStatus("active");
    lastActivityRef.current = Date.now();
    startSilenceTimer();
  }, [clearTimers, startSilenceTimer]);

  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  return {
    status,
    silenceCount,
    recordActivity,
    startSession,
    closeSession,
    resetSession,
  };
}
