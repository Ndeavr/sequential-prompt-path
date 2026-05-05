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
  isVisualProjectMessage,
  detectContractorIntent,
} from "../services/alexConversationEngine";
import { useAlexVoice } from "./useAlexVoice";
import { useAlexVisualStore } from "../visual/visualStore";
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

      // Contractor onboarding — push intake panel.
      if (detectContractorIntent(text)) {
        useAlexVisualStore.getState().pushAction({
          id: `contractor-intake-${Date.now()}`,
          type: "contractor_intake",
          payload: {},
        });
      } else if (isVisualProjectMessage(text)) {
        // Visual project — open upload zone immediately.
        useAlexVisualStore.getState().pushAction({
          id: `upload-${Date.now()}`,
          type: "upload_zone",
          payload: { userMessageContext: text, title: "Ajouter une photo de l'espace" },
        });
      }

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

  const handleUpload = useCallback(async (file?: File, userMessage?: string) => {
    const state = useAlexStore.getState();
    state.markUserEngaged();
    state.resetNoResponse();
    state.startImageAnalysis();

    // Acknowledge fast (1 line, no checklist)
    const ack = acknowledgeUpload(state.activeLanguage);
    state.injectAssistantMessage(ack.text, false);

    // Without a file we can't analyze — bail with the ack only.
    if (!file) {
      state.finishImageAnalysis();
      return;
    }

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => {
          const s = String(r.result || "");
          resolve(s.includes(",") ? s.split(",")[1] : s);
        };
        r.onerror = () => reject(new Error("read_failed"));
        r.readAsDataURL(file);
      });

      // Visual project flow → propose 2 styles with previews.
      const isVisual =
        (userMessage && isVisualProjectMessage(userMessage)) ||
        state.currentIntent === "photo_upload";

      if (isVisual) {
        const resp = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/alex-visual-styles`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({
              image_base64: base64,
              mime_type: file.type || "image/jpeg",
            }),
          }
        );
        const data = await resp.json();
        if (!resp.ok || !data.styles?.length) {
          const fb = "Je n'arrive pas à générer les aperçus pour le moment. Décrivez-moi le résultat souhaité et je vous oriente.";
          state.injectAssistantMessage(fb, true);
          await speak(fb);
        } else {
          const intro = data.intro_text || "Voici deux directions possibles. Laquelle vous attire le plus?";
          state.injectAssistantMessage(intro, true);
          useAlexVisualStore.getState().pushAction({
            id: `styles-${Date.now()}`,
            type: "visual_style_comparison",
            payload: data,
          });
          await speak(intro);
        }
      } else {
        const resp = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/alex-analyze-image`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({
              image_base64: base64,
              mime_type: file.type || "image/jpeg",
              user_message: userMessage || "",
            }),
          }
        );
        const data = await resp.json();
        if (!resp.ok || !data.response_text) {
          const fallback =
            "Je n'arrive pas à analyser cette image pour l'instant. Décrivez-moi en une phrase ce qui vous inquiète et je vous oriente.";
          state.injectAssistantMessage(fallback, true);
          await speak(fallback);
        } else {
          state.injectAssistantMessage(data.response_text, true);
          if (data.intent === "property_risk_assessment") {
            state.setIntent("homeowner_problem" as AlexIntent);
          }
          await speak(data.response_text);
        }
      }
    } catch (e) {
      alexLog("conversation:upload_error", { e: String(e) });
      const fallback =
        "Je n'arrive pas à analyser cette image pour l'instant. Décrivez-moi en une phrase ce qui vous inquiète et je vous oriente.";
      state.injectAssistantMessage(fallback, true);
      await speak(fallback);
    } finally {
      state.finishImageAnalysis();
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
