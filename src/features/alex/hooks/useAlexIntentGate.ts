/**
 * Alex 100M — Intent Gate Hook
 * Evaluates transcript events and UI actions.
 * Prevents false replies from noise / low confidence.
 */

import { useCallback } from "react";
import { useAlexStore } from "../state/alexStore";
import { classifyTranscript } from "../services/alexNoiseGate";
import { classifyIntent } from "../services/alexIntentClassifier";
import { alexLog } from "../utils/alexDebug";
import type { STTTranscriptEvent, AlexIntent, NoiseGateResult } from "../types/alex.types";

export interface IntentGateResult {
  gate: NoiseGateResult;
  intent: AlexIntent;
  text: string;
  shouldReply: boolean;
}

export function useAlexIntentGate() {
  const evaluateTranscript = useCallback(
    (event: STTTranscriptEvent): IntentGateResult => {
      const gate = classifyTranscript(event);
      const text = event.text.trim();

      if (gate !== "valid_input") {
        alexLog("intentGate:blocked", { gate, text: text.slice(0, 40) });
        return { gate, intent: "unknown", text, shouldReply: false };
      }

      const intent = classifyIntent(text);
      alexLog("intentGate:pass", { intent, text: text.slice(0, 60) });
      return { gate, intent, text, shouldReply: true };
    },
    []
  );

  const evaluateUIAction = useCallback(
    (actionKey: string): IntentGateResult => {
      const intent = actionKey as AlexIntent;
      useAlexStore.getState().markUserEngaged();
      useAlexStore.getState().resetNoResponse();
      alexLog("intentGate:ui_action", { actionKey });
      return { gate: "valid_input", intent, text: actionKey, shouldReply: true };
    },
    []
  );

  return { evaluateTranscript, evaluateUIAction };
}
