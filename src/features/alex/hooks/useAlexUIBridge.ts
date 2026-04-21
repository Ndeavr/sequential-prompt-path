/**
 * Alex 100M — UI Bridge Hook
 * Orchestrates user engagement signals from UI interactions.
 * Resets inactivity on valid engagement, ignores noise.
 */

import { useCallback } from "react";
import { useAlexStore } from "../state/alexStore";
import { useAlexConversation } from "./useAlexConversation";
import { alexLog } from "../utils/alexDebug";

export function useAlexUIBridge() {
  const { sendTextMessage, handleUpload, handleQuickActionSelect } =
    useAlexConversation();

  /** User sent a text message */
  const onTextSubmit = useCallback(
    async (text: string) => {
      if (!text.trim()) return;
      await sendTextMessage(text.trim());
    },
    [sendTextMessage]
  );

  /** User clicked a quick action */
  const onQuickAction = useCallback(
    async (actionKey: string) => {
      await handleQuickActionSelect(actionKey);
    },
    [handleQuickActionSelect]
  );

  /** User uploaded a file/image */
  const onFileUpload = useCallback(async () => {
    await handleUpload();
  }, [handleUpload]);

  /** User clicked panel to restore from minimized */
  const onRestore = useCallback(() => {
    const state = useAlexStore.getState();
    state.restoreAssistant();
    state.markUserEngaged();
    state.resetNoResponse();
    state.resetAutoReprompt();
    alexLog("uiBridge:restored");
  }, []);

  /** User selected an A/B option */
  const onOptionSelect = useCallback(
    async (optionKey: string) => {
      const state = useAlexStore.getState();
      state.markUserEngaged();
      state.resetNoResponse();
      await handleQuickActionSelect(optionKey);
      alexLog("uiBridge:optionSelected", { optionKey });
    },
    [handleQuickActionSelect]
  );

  /** User clicked a CTA (login, contractor card, etc.) */
  const onCTAClick = useCallback((ctaId: string) => {
    const state = useAlexStore.getState();
    state.markUserEngaged();
    state.resetNoResponse();
    alexLog("uiBridge:ctaClick", { ctaId });
  }, []);

  /** Dismiss soft prompt */
  const onDismissSoftPrompt = useCallback(() => {
    useAlexStore.getState().clearSoftPrompt();
    alexLog("uiBridge:dismissSoftPrompt");
  }, []);

  /** Minimize manually */
  const onMinimize = useCallback(() => {
    useAlexStore.getState().minimizeAssistant();
    alexLog("uiBridge:minimize");
  }, []);

  return {
    onTextSubmit,
    onQuickAction,
    onFileUpload,
    onRestore,
    onOptionSelect,
    onCTAClick,
    onDismissSoftPrompt,
    onMinimize,
  };
}
