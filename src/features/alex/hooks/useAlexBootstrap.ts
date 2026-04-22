/**
 * Alex 100M — Bootstrap Hook V6
 * Deterministic hard boot. Greeting injected + autoplay attempted once.
 * If autoplay fails → shouldSpeakGreetingOnUnlock = true. First tap speaks immediately.
 */

import { useEffect, useRef } from "react";
import { DEFAULT_ALEX_QUICK_ACTIONS, useAlexStore } from "../state/alexStore";
import { elevenlabsService } from "../services/elevenlabsService";
import { sttService } from "../services/sttService";
import { alexLog } from "../utils/alexDebug";

const HARD_BOOT_GREETING = "Bonjour.";
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

/**
 * Build greeting text. If user firstName available, personalize.
 */
function buildGreeting(): string {
  // Try to get user info from Supabase session stored in localStorage
  try {
    const keys = Object.keys(localStorage);
    for (const key of keys) {
      if (key.startsWith("sb-") && key.endsWith("-auth-token")) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          const firstName =
            parsed?.user?.user_metadata?.first_name ||
            parsed?.user?.user_metadata?.full_name?.split(" ")[0];
          if (firstName) return `Bonjour ${firstName}.`;
        }
      }
    }
  } catch {
    // ignore
  }
  return HARD_BOOT_GREETING;
}

export function useAlexBootstrap() {
  const booted = useRef(false);

  useEffect(() => {
    if (booted.current) return;
    booted.current = true;

    const store = useAlexStore.getState();
    if (store.isInitialized && store.messages.length > 0) return;

    alexLog("boot:v6:start");

    try {
      store.bootstrapStart();

      const sessionId = store.sessionId || crypto.randomUUID();
      const greeting = buildGreeting();

      // Local-first UI boot — nothing depends on voice/STT/backend
      useAlexStore.setState({
        sessionId,
        activeLanguage: "fr-CA",
        quickActions: DEFAULT_ALEX_QUICK_ACTIONS,
        pendingGreetingText: greeting,
      });

      const current = useAlexStore.getState();
      if (current.messages.length === 0 && !current.isGreetingInjected) {
        current.injectAssistantMessage(greeting, false);
        useAlexStore.setState({ lastAssistantQuestionAt: Date.now() });
        alexLog("boot:v6:greeting_injected", { greeting });
      }

      useAlexStore.getState().showQuickActions(DEFAULT_ALEX_QUICK_ACTIONS);
      useAlexStore.getState().bootstrapSuccess(sessionId);
      useAlexStore.getState().setMode("ready");
      alexLog("boot:v6:ui_ready", { sessionId });
    } catch (error) {
      alexLog("boot:v6:ui_boot_error", error);
      useAlexStore.getState().bootstrapFailure();
    }

    // Async voice attempt — never blocks UI
    window.setTimeout(async () => {
      try {
        elevenlabsService.init();
        useAlexStore.setState({
          isVoiceAvailable: elevenlabsService.isReady(),
          isSTTAvailable: sttService.isAvailable(),
        });
        alexLog("boot:v6:services_ready");
      } catch (error) {
        useAlexStore.setState({
          isVoiceAvailable: false,
          isSTTAvailable: false,
          isAutoplayAllowed: false,
          audioUnlockRequired: true,
          shouldSpeakGreetingOnUnlock: true,
          hasAttemptedInitialAutoplay: true,
          mode: "ready",
        });
        alexLog("boot:v6:service_init_failed", error);
        return;
      }

      const state = useAlexStore.getState();
      if (state.isGreetingSpoken || !state.shouldAutoStartOnLoad) return;

      const greetingMsg = state.messages.find((m) => m.role === "assistant");
      if (!greetingMsg) return;

      // Single autoplay attempt — no retry loop
      try {
        state.startSpeaking();
        useAlexStore.setState({ hasAttemptedInitialAutoplay: true });
        await withTimeout(
          elevenlabsService.speak(
            greetingMsg.text,
            () => alexLog("boot:v6:autoplay_started"),
            () => useAlexStore.getState().stopSpeaking()
          ),
          VOICE_AUTOPLAY_TIMEOUT_MS
        );
        useAlexStore.setState({
          isGreetingSpoken: true,
          isAutoplayAllowed: true,
          isAudioUnlocked: true,
          audioUnlockRequired: false,
          shouldSpeakGreetingOnUnlock: false,
          pendingGreetingText: null,
          mode: "ready",
        });
        alexLog("boot:v6:autoplay_success");
      } catch (error) {
        elevenlabsService.stop();
        useAlexStore.getState().stopSpeaking();
        useAlexStore.setState({
          isAutoplayAllowed: false,
          isGreetingSpoken: false,
          audioUnlockRequired: true,
          shouldSpeakGreetingOnUnlock: true,
          mode: "ready",
        });
        alexLog("boot:v6:autoplay_blocked_fallback", error);
      }
    }, VOICE_ATTEMPT_DELAY_MS);
  }, []);
}
