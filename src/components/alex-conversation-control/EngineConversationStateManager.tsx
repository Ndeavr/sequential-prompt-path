/**
 * EngineConversationStateManager — Wraps children with silence detection + auto-close.
 * 
 * RULES:
 * - Max 2 reminders
 * - Auto-close after 2nd reminder + 5s
 * - Fade-out 300ms on close
 */
import { useCallback, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAlexConversationControl, getReminders, type ConversationStatus } from "@/hooks/useAlexConversationControl";

interface Props {
  language?: "fr" | "en";
  onReminderMessage?: (text: string) => void;
  onSessionClosed?: () => void;
  onStatusChange?: (status: ConversationStatus) => void;
  children: (controls: {
    status: ConversationStatus;
    silenceCount: number;
    recordActivity: () => void;
    closeSession: () => void;
    resetSession: () => void;
  }) => ReactNode;
}

export default function EngineConversationStateManager({
  language = "fr",
  onReminderMessage,
  onSessionClosed,
  onStatusChange,
  children,
}: Props) {
  const reminders = getReminders(language);

  const control = useAlexConversationControl({
    onReminder1: () => onReminderMessage?.(reminders.reminder1),
    onReminder2: () => onReminderMessage?.(reminders.reminder2),
    onAutoClose: () => onSessionClosed?.(),
    onStatusChange,
  });

  return (
    <AnimatePresence mode="wait">
      {control.status !== "closed" ? (
        <motion.div
          key="active"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {children({
            status: control.status,
            silenceCount: control.silenceCount,
            recordActivity: control.recordActivity,
            closeSession: control.closeSession,
            resetSession: control.resetSession,
          })}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
