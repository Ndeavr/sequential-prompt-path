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
  // Terminal lock: once flipped, NO more follow-ups, ever.
  const terminalRef = useRef<TerminalReason | null>(null);

  const updateStatus = useCallback((s: ConversationStatus) => {
    setStatus(s);
    onStatusChange?.(s);
  }, [onStatusChange]);

  const clearTimers = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
  }, []);

  const isTerminal = useCallback(
    () => terminalRef.current !== null,
    [],
  );

  const startSilenceTimer = useCallback(() => {
    clearTimers();
    if (isTerminal()) return; // never re-arm after terminal

    // Attempt #1 after silenceThreshold1Ms
    timerRef.current = setTimeout(() => {
      if (isTerminal()) return;
      setSilenceCount((prev) => {
        const next = prev + 1;
        if (next === 1) {
          updateStatus("idle");
          onReminder1?.();

          // Schedule attempt #2 after silenceThreshold2Ms - silenceThreshold1Ms
          const gap = Math.max(
            (silenceThreshold2Ms ?? 30_000) - (silenceThreshold1Ms ?? 15_000),
            5_000,
          );
          closeTimerRef.current = setTimeout(() => {
            if (isTerminal()) return;
            setSilenceCount((p) => p + 1);
            updateStatus("closing");
            onReminder2?.();

            // After attempt #2 → mark abandoned and auto-close. NO third message.
            setTimeout(() => {
              terminalRef.current = "manual";
              updateStatus("abandoned");
              onAutoClose?.();
            }, autoCloseDelayMs ?? 5_000);
          }, gap);
        }
        return next;
      });
    }, silenceThreshold1Ms);
  }, [
    silenceThreshold1Ms,
    silenceThreshold2Ms,
    autoCloseDelayMs,
    onReminder1,
    onReminder2,
    onAutoClose,
    clearTimers,
    isTerminal,
    updateStatus,
  ]);

  /** Call on every user interaction (message, click, voice) */
  const recordActivity = useCallback(() => {
    if (isTerminal()) return; // closed → never re-engage
    lastActivityRef.current = Date.now();
    clearTimers();
    setSilenceCount(0);
    if (status === "idle" || status === "closing") {
      updateStatus("active");
    }
    startSilenceTimer();
  }, [status, isTerminal, clearTimers, startSilenceTimer, updateStatus]);

  /** Start monitoring */
  const startSession = useCallback(() => {
    terminalRef.current = null;
    updateStatus("active");
    setSilenceCount(0);
    lastActivityRef.current = Date.now();
    startSilenceTimer();
  }, [startSilenceTimer, updateStatus]);

  /** Force close (user closed overlay, navigation, etc.) */
  const closeSession = useCallback(() => {
    clearTimers();
    terminalRef.current = terminalRef.current ?? "manual";
    updateStatus("closed");
  }, [clearTimers, updateStatus]);

  /**
   * Mark the conversation as TERMINAL — booking confirmed, recommendation
   * delivered, user said thanks/goodbye, or summary complete. After this,
   * NO follow-up ("Êtes-vous toujours là ?") is allowed.
   */
  const markClosed = useCallback(
    (reason: TerminalReason) => {
      clearTimers();
      terminalRef.current = reason;
      updateStatus("closed");
    },
    [clearTimers, updateStatus],
  );

  /** Reset for new session */
  const resetSession = useCallback(() => {
    clearTimers();
    terminalRef.current = null;
    setSilenceCount(0);
    updateStatus("active");
    lastActivityRef.current = Date.now();
    startSilenceTimer();
  }, [clearTimers, startSilenceTimer, updateStatus]);

  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  return {
    status,
    silenceCount,
    recordActivity,
    startSession,
    closeSession,
    markClosed,
    resetSession,
    isTerminal: terminalRef.current !== null,
  };
}
