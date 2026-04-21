/**
 * Alex 100M — Bootstrap Hook
 * Deterministic boot sequence. No service failure blocks text chat.
 */

import { useEffect, useRef } from "react";
import { useAlexStore } from "../state/alexStore";
import { elevenlabsService } from "../services/elevenlabsService";
import { sttService } from "../services/sttService";
import { alexWelcomeManager } from "../services/alexWelcomeManager";
import { alexLog } from "../utils/alexDebug";
import {
  BOOT_GREETING_RENDER_MS,
  AUTOPLAY_ATTEMPT_MS,
} from "../utils/alexTimers";
import type { AlexQuickAction } from "../types/alex.types";

const DEFAULT_QUICK_ACTIONS: AlexQuickAction[] = [
  { key: "homeowner_problem", labelFr: "J'ai un problème", labelEn: "I have a problem", intent: "homeowner_problem", icon: "🏠" },
  { key: "photo_upload", labelFr: "Envoyer une photo", labelEn: "Send a photo", intent: "photo_upload", icon: "📷" },
  { key: "quote_compare", labelFr: "Comparer des soumissions", labelEn: "Compare quotes", intent: "quote_compare", icon: "📊" },
  { key: "contractor_onboarding", labelFr: "Je suis entrepreneur", labelEn: "I'm a contractor", intent: "contractor_onboarding", icon: "🔧" },
  { key: "booking", labelFr: "Prendre rendez-vous", labelEn: "Book appointment", intent: "booking", icon: "📅" },
];

export function useAlexBootstrap() {
  const booted = useRef(false);
  const store = useAlexStore;

  useEffect(() => {
    if (booted.current) return;
    booted.current = true;

    const state = store.getState();
    if (state.isInitialized) return;

    alexLog("boot:start");
    store.getState().bootstrapStart();

    const sessionId = crypto.randomUUID();
    const lang = state.activeLanguage;
    const role = state.userRole;
    const isRestore = state.isSessionRestored;

    // Step 1: Inject greeting text immediately
    setTimeout(() => {
      const s = store.getState();
      if (s.isGreetingInjected) return;

      const greeting = alexWelcomeManager.buildGreeting(lang, role, isRestore);
      if (alexWelcomeManager.markGreetingInjected()) {
        s.injectAssistantMessage(greeting);
        alexLog("boot:greeting_injected");
      }
    }, BOOT_GREETING_RENDER_MS);

    // Step 2: Surface quick actions
    store.getState().showQuickActions(DEFAULT_QUICK_ACTIONS);

    // Step 3: Init services (non-blocking)
    let voiceAvailable = false;
    let sttAvailable = false;

    try {
      elevenlabsService.init();
      voiceAvailable = elevenlabsService.isReady();
      alexLog("boot:tts_ready");
    } catch {
      alexLog("boot:tts_failed");
    }

    try {
      sttAvailable = sttService.isAvailable();
      alexLog("boot:stt_available", { sttAvailable });
    } catch {
      alexLog("boot:stt_failed");
    }

    store.setState({
      isVoiceAvailable: voiceAvailable,
      isSTTAvailable: sttAvailable,
    });

    // Step 4: Attempt autoplay greeting
    if (voiceAvailable) {
      setTimeout(async () => {
        const s = store.getState();
        if (s.isGreetingSpoken) return;

        const greetingMsg = s.messages.find(
          (m) => m.role === "assistant" && !m.isSpoken
        );
        if (!greetingMsg) return;

        try {
          if (!alexWelcomeManager.markGreetingSpoken()) return;

          s.startSpeaking();
          await elevenlabsService.speak(
            greetingMsg.text,
            () => alexLog("boot:autoplay_started"),
            () => {
              store.getState().stopSpeaking();
              alexLog("boot:autoplay_ended");
            }
          );
          store.getState().setAutoplayAllowed(true);
          store.getState().setAudioUnlocked(true);
        } catch {
          // Autoplay blocked — user tap will unlock later
          store.getState().stopSpeaking();
          store.getState().setAutoplayAllowed(false);
          alexLog("boot:autoplay_blocked");
        }
      }, AUTOPLAY_ATTEMPT_MS);
    }

    // Step 5: Complete bootstrap
    store.getState().bootstrapSuccess(sessionId);

    if (!voiceAvailable) {
      store.setState({ mode: "fallback_text" });
      alexLog("boot:fallback_text_mode");
    }

    alexLog("boot:complete", { sessionId, voiceAvailable, sttAvailable });
  }, []);
}
