/**
 * Alex 100M — Bootstrap Hook
 * Deterministic hard boot. Text/chat UI never waits for voice, STT, restore, or backend.
 */

import { useEffect, useRef } from "react";
import { DEFAULT_ALEX_QUICK_ACTIONS, useAlexStore } from "../state/alexStore";
import { elevenlabsService } from "../services/elevenlabsService";
import { sttService } from "../services/sttService";
import { alexLog } from "../utils/alexDebug";

const HARD_BOOT_GREETING = "Bonjour. Quel est votre projet?";
const VOICE_ATTEMPT_DELAY_MS = 200;
const VOICE_AUTOPLAY_TIMEOUT_MS = 3500;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      window.setTimeout(() => reject(new Error("Alex voice autoplay timeout")), ms);
    }),
  ]);
}

export function useAlexBootstrap() {
  const booted = useRef(false);

  useEffect(() => {
    if (booted.current) return;
    booted.current = true;

    const store = useAlexStore.getState();
    if (store.isInitialized && store.messages.length > 0) return;

    alexLog("boot:v5:start");

    try {
      store.bootstrapStart();

      const sessionId = store.sessionId || crypto.randomUUID();

      // Local-first UI boot. Nothing here depends on voice, STT, backend, or restore.
      useAlexStore.setState({
        sessionId,
        activeLanguage: "fr-CA",
        quickActions: DEFAULT_ALEX_QUICK_ACTIONS,
      });

      const current = useAlexStore.getState();
      if (current.messages.length === 0 && !current.isGreetingInjected) {
        current.injectAssistantMessage(HARD_BOOT_GREETING, false);
        useAlexStore.setState({ lastAssistantQuestionAt: Date.now() });
        alexLog("boot:v5:greeting_injected");
      }

      useAlexStore.getState().showQuickActions(DEFAULT_ALEX_QUICK_ACTIONS);
      useAlexStore.getState().bootstrapSuccess(sessionId);
      useAlexStore.getState().setMode("ready");
      alexLog("boot:v5:ui_ready", { sessionId });
    } catch (error) {
      alexLog("boot:v5:ui_boot_error", error);
      useAlexStore.getState().bootstrapFailure();
    }

    window.setTimeout(async () => {
      try {
        elevenlabsService.init();
        useAlexStore.setState({
          isVoiceAvailable: elevenlabsService.isReady(),
          isSTTAvailable: sttService.isAvailable(),
        });
        alexLog("boot:v5:services_ready");
      } catch (error) {
        useAlexStore.setState({
          isVoiceAvailable: false,
          isSTTAvailable: false,
          isAutoplayAllowed: false,
          mode: "ready",
        });
        alexLog("boot:v5:service_init_failed", error);
        return;
      }

      const state = useAlexStore.getState();
      if (state.isGreetingSpoken || !state.shouldAutoStartOnLoad) return;

      const greetingMsg = state.messages.find((m) => m.role === "assistant");
      if (!greetingMsg) return;

      try {
        state.startSpeaking();
        await withTimeout(
          elevenlabsService.speak(
            greetingMsg.text,
            () => alexLog("boot:v5:autoplay_started"),
            () => useAlexStore.getState().stopSpeaking()
          ),
          VOICE_AUTOPLAY_TIMEOUT_MS
        );
        useAlexStore.setState({
          isGreetingSpoken: true,
          isAutoplayAllowed: true,
          isAudioUnlocked: true,
          mode: "ready",
        });
        alexLog("boot:v5:autoplay_success");
      } catch (error) {
        elevenlabsService.stop();
        useAlexStore.getState().stopSpeaking();
        useAlexStore.setState({
          isAutoplayAllowed: false,
          isGreetingSpoken: false,
          mode: "ready",
        });
        alexLog("boot:v5:autoplay_fallback", error);
      }
    }, VOICE_ATTEMPT_DELAY_MS);
  }, []);
}
