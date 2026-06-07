/**
 * VoiceEngineAlexController — Central controller for Alex voice persona.
 * Manages voice profile, language detection, playback state, and identity guardrails.
 *
 * Adds: terminal-state detection. When the user thanks Alex or says goodbye,
 * the conversation is marked closed and the silence engine STOPS prompting.
 */
import { useEffect, useCallback } from "react";
import { useAlexVoicePersona, type VoiceLanguage } from "@/hooks/useAlexVoicePersona";
import { useAlexConversationControl, getReminders } from "@/hooks/useAlexConversationControl";
import { detectTerminalIntent } from "@/lib/alexTerminalIntents";
import PlayerVoiceResponse from "./PlayerVoiceResponse";
import GuardrailVoiceConsistency from "./GuardrailVoiceConsistency";

interface Props {
  onReminderMessage?: (text: string) => void;
  onAutoClose?: () => void;
  onLanguageSwitch?: (lang: VoiceLanguage) => void;
  children?: React.ReactNode;
}

export default function VoiceEngineAlexController({ onReminderMessage, onAutoClose, onLanguageSwitch, children }: Props) {
  const persona = useAlexVoicePersona();
  const reminders = getReminders(persona.activeLanguage);

  const conversation = useAlexConversationControl({
    onReminder1: () => onReminderMessage?.(reminders.reminder1),
    onReminder2: () => onReminderMessage?.(reminders.reminder2),
    onAutoClose,
  });

  const handleUserInput = useCallback((text: string) => {
    const detectedLang = persona.autoDetectAndSwitch(text);
    conversation.recordActivity();

    // Terminal intent — user said thanks / goodbye. Stop all follow-ups.
    const terminal = detectTerminalIntent(text);
    if (terminal) {
      conversation.markClosed(terminal);
      return;
    }

    if (detectedLang !== persona.activeLanguage) {
      onLanguageSwitch?.(detectedLang);
    }
  }, [persona, conversation, onLanguageSwitch]);

  useEffect(() => {
    conversation.startSession();
    return () => conversation.closeSession();
  }, []);

  return (
    <div className="relative">
      <GuardrailVoiceConsistency
        activeProfile={persona.activeProfile}
        language={persona.activeLanguage}
        conversationStatus={conversation.status}
      />
      {children}
    </div>
  );
}
