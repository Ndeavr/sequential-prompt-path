/**
 * Alex 100M — Inactivity Hook
 * Centralized timers. One soft prompt, one reprompt max, then minimize.
 * NEVER uses forbidden prompts.
 */

import { useEffect, useRef } from "react";
import { useAlexStore } from "../state/alexStore";
import { getSoftPrompt } from "../utils/alexCopy";
import { shouldAutoMinimize, canAutoReprompt } from "../utils/alexGuards";
import {
  IDLE_SOFT_PROMPT_DELAY_MS,
  IDLE_REPROMPT_DELAY_MS,
  AUTO_MINIMIZE_DELAY_MS,
} from "../utils/alexTimers";
import { alexLog } from "../utils/alexDebug";

const REPROMPT_FR = [
  "Je suis prête.",
  "Vous pouvez écrire ou envoyer une photo.",
  "Choisissez une option ci-dessous.",
  "Je reste disponible.",
];

const REPROMPT_EN = [
  "I'm ready.",
  "You can type or send a photo.",
  "Choose an option below.",
  "I'm still here for you.",
];

function pickReprompt(lang: string): string {
  const pool = lang === "fr-CA" ? REPROMPT_FR : REPROMPT_EN;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function useAlexInactivity() {
  const softTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const repromptTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const minimizeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const mode = useAlexStore((s) => s.mode);
  const lastAssistantQuestionAt = useAlexStore((s) => s.lastAssistantQuestionAt);
  const consecutiveNoResponseCount = useAlexStore((s) => s.consecutiveNoResponseCount);
  const autoRepromptCount = useAlexStore((s) => s.autoRepromptCount);
  const isUserEngaged = useAlexStore((s) => s.isUserEngaged);
  const activeLanguage = useAlexStore((s) => s.activeLanguage);

  const clearAll = () => {
    if (softTimer.current) clearTimeout(softTimer.current);
    if (repromptTimer.current) clearTimeout(repromptTimer.current);
    if (minimizeTimer.current) clearTimeout(minimizeTimer.current);
    softTimer.current = null;
    repromptTimer.current = null;
    minimizeTimer.current = null;
  };

  useEffect(() => {
    // Only run inactivity cycle when waiting for user reply
    if (mode !== "waiting_for_reply") {
      clearAll();
      return;
    }

    // Already exceeded limits
    if (shouldAutoMinimize(consecutiveNoResponseCount, autoRepromptCount)) {
      useAlexStore.getState().minimizeAssistant();
      alexLog("inactivity:auto_minimized");
      return;
    }

    // Soft prompt (visual only)
    softTimer.current = setTimeout(() => {
      const s = useAlexStore.getState();
      if (s.mode !== "waiting_for_reply") return;
      s.showSoftPrompt(getSoftPrompt(activeLanguage));
      s.incrementNoResponse();
      alexLog("inactivity:soft_prompt");
    }, IDLE_SOFT_PROMPT_DELAY_MS);

    // Single spoken reprompt
    repromptTimer.current = setTimeout(() => {
      const s = useAlexStore.getState();
      if (s.mode !== "waiting_for_reply" && s.mode !== "soft_prompt_visible") return;
      if (!canAutoReprompt(s.autoRepromptCount)) return;

      const text = pickReprompt(activeLanguage);
      s.injectAssistantMessage(text, false);
      s.incrementAutoReprompt();
      s.incrementNoResponse();
      alexLog("inactivity:reprompt", { text });
    }, IDLE_REPROMPT_DELAY_MS);

    // Auto minimize
    minimizeTimer.current = setTimeout(() => {
      const s = useAlexStore.getState();
      if (s.mode === "minimized" || s.mode === "speaking") return;
      s.setMode("closing_due_to_inactivity");
      setTimeout(() => {
        useAlexStore.getState().minimizeAssistant();
      }, 1500);
      alexLog("inactivity:minimize");
    }, AUTO_MINIMIZE_DELAY_MS);

    return clearAll;
  }, [mode, lastAssistantQuestionAt, consecutiveNoResponseCount, autoRepromptCount, activeLanguage]);
}
