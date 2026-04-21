/**
 * Alex 100M — Conversation Orchestration Hook
 * Routes user input to conversation engine, manages assistant turns.
 */

import { useCallback } from "react";
import { useAlexStore } from "../state/alexStore";
import {
  processUserMessage,
  acknowledgeUpload,
  handleQuickAction,
} from "../services/alexConversationEngine";
import { useAlexVoice } from "./useAlexVoice";
import { alexLog } from "../utils/alexDebug";
import type { AlexIntent, STTTranscriptEvent } from "../types/alex.types";

export function useAlexConversation() {
  const { speak } = useAlexVoice();

  const sendTextMessage = useCallback(
    async (text: string) => {
      const state = useAlexStore.getState();
      state.addUserMessage(text);
      state.setMode("thinking");

      const response = processUserMessage(
        text,
        state.activeLanguage,
        state.userRole
      );

      state.injectAssistantMessage(response.text, response.speak);
      if (response.intent) state.setIntent(response.intent);
      state.setMode("waiting_for_reply");
      useAlexStore.setState({ lastAssistantQuestionAt: Date.now() });

      if (response.speak) {
        await speak(response.text);
      }

      alexLog("conversation:text", { text: text.slice(0, 60) });
    },
    [speak]
  );

  const handleVoiceInput = useCallback(
    async (event: STTTranscriptEvent) => {
      const state = useAlexStore.getState();
      state.addUserMessage(event.text);
      state.setMode("thinking");

      const response = processUserMessage(
        event.text,
        state.activeLanguage,
        state.userRole
      );

      state.injectAssistantMessage(response.text, response.speak);
      if (response.intent) state.setIntent(response.intent);
      state.setMode("waiting_for_reply");
      useAlexStore.setState({ lastAssistantQuestionAt: Date.now() });

      if (response.speak) {
        await speak(response.text);
      }

      alexLog("conversation:voice", { text: event.text.slice(0, 60) });
    },
    [speak]
  );

  const handleUpload = useCallback(async () => {
    const state = useAlexStore.getState();
    state.markUserEngaged();
    state.resetNoResponse();
    state.startImageAnalysis();

    const response = acknowledgeUpload(state.activeLanguage);
    state.injectAssistantMessage(response.text, response.speak);

    if (response.speak) {
      await speak(response.text);
    }

    alexLog("conversation:upload");
  }, [speak]);

  const handleQuickActionSelect = useCallback(
    async (actionKey: string) => {
      const state = useAlexStore.getState();
      state.markUserEngaged();
      state.resetNoResponse();
      state.setMode("thinking");

      const response = handleQuickAction(
        actionKey,
        state.activeLanguage,
        state.userRole
      );

      state.addUserMessage(actionKey, response.intent);
      state.injectAssistantMessage(response.text, response.speak);
      if (response.intent) state.setIntent(response.intent);
      state.setMode("waiting_for_reply");
      useAlexStore.setState({ lastAssistantQuestionAt: Date.now() });

      if (response.speak) {
        await speak(response.text);
      }

      alexLog("conversation:quickAction", { actionKey });
    },
    [speak]
  );

  return {
    sendTextMessage,
    handleVoiceInput,
    handleUpload,
    handleQuickActionSelect,
  };
}
