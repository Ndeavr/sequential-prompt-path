/**
 * Alex 100M — Bootstrap Hook V7
 * - Verified auth name via Supabase getSession()
 * - Forced fr-CA on boot
 * - connecting_voice mode for autoplay attempt
 */

import { useEffect, useRef } from "react";
import { DEFAULT_ALEX_QUICK_ACTIONS, useAlexStore } from "../state/alexStore";
import { elevenlabsService } from "../services/elevenlabsService";
import { sttService } from "../services/sttService";
import { supabase } from "@/integrations/supabase/client";
import { alexLog } from "../utils/alexDebug";

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
 * V7: Verified greeting name from live Supabase auth session.
 * Never reads stale localStorage tokens directly.
 */
async function getVerifiedGreetingName(): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return null;

    const firstName =
      session.user.user_metadata?.first_name ||
      session.user.user_metadata?.full_name?.split(" ")[0];

    if (firstName && typeof firstName === "string" && firstName.trim().length > 0) {
      alexLog("boot:USER_NAME_VERIFIED", { firstName, userId: session.user.id });
      useAlexStore.setState({ verifiedGreetingName: firstName.trim() });
      return firstName.trim();
    }
    return null;
  } catch {
    alexLog("boot:USER_NAME_VERIFICATION_FAILED");
    return null;
  }
}

function buildGreeting(firstName: string | null): string {
  if (firstName) return `Bonjour ${firstName}.`;
  return "Bonjour.";
}

export function useAlexBootstrap() {
  const booted = useRef(false);

  useEffect(() => {
    if (booted.current) return;
    booted.current = true;

    const store = useAlexStore.getState();
    if (store.isInitialized && store.messages.length > 0) return;

    alexLog("boot:v7:start");

    // V7: Force fr-CA immediately
    useAlexStore.setState({
      activeLanguage: "fr-CA",
      openingLanguageLocked: true,
    });
    alexLog("boot:OPENING_LANGUAGE_LOCKED_FR_CA");

    try {
      store.bootstrapStart();

      const sessionId = store.sessionId || crypto.randomUUID();

      // Inject "Bonjour." immediately — will update with name if auth resolves
      const defaultGreeting = "Bonjour.";

      useAlexStore.setState({
        sessionId,
        quickActions: DEFAULT_ALEX_QUICK_ACTIONS,
        pendingGreetingText: defaultGreeting,
      });

      const current = useAlexStore.getState();
      if (current.messages.length === 0 && !current.isGreetingInjected) {
        current.injectAssistantMessage(defaultGreeting, false);
        useAlexStore.setState({ lastAssistantQuestionAt: Date.now() });
        alexLog("boot:v7:greeting_injected", { greeting: defaultGreeting });
      }

      useAlexStore.getState().showQuickActions(DEFAULT_ALEX_QUICK_ACTIONS);
      useAlexStore.getState().bootstrapSuccess(sessionId);
      useAlexStore.getState().setMode("ready");
      alexLog("boot:v7:ui_ready", { sessionId });
    } catch (error) {
      alexLog("boot:v7:ui_boot_error", error);
      useAlexStore.getState().bootstrapFailure();
    }

    // Async: verify name + attempt voice
    window.setTimeout(async () => {
      // V7: Verify user name from live auth session
      const verifiedName = await getVerifiedGreetingName();
      if (verifiedName) {
        const personalGreeting = buildGreeting(verifiedName);
        useAlexStore.setState({ pendingGreetingText: personalGreeting });

        // Update the displayed greeting message if it was the default
        const state = useAlexStore.getState();
        const lastAssistant = state.messages.findIndex(
          (m) => m.role === "assistant" && m.text === "Bonjour."
        );
        if (lastAssistant >= 0) {
          const updatedMessages = [...state.messages];
          updatedMessages[lastAssistant] = {
            ...updatedMessages[lastAssistant],
            text: personalGreeting,
          };
          useAlexStore.setState({ messages: updatedMessages });
          alexLog("boot:v7:greeting_personalized", { greeting: personalGreeting });
        }
      }

      // Init voice services
      try {
        elevenlabsService.init();
        alexLog("boot:APPROVED_FEMALE_VOICE_LOCKED");
        useAlexStore.setState({
          isVoiceAvailable: elevenlabsService.isReady(),
          isSTTAvailable: sttService.isAvailable(),
          voiceLockedValid: true,
        });
        alexLog("boot:v7:services_ready");
      } catch (error) {
        useAlexStore.setState({
          isVoiceAvailable: false,
          isSTTAvailable: false,
          isAutoplayAllowed: false,
          audioUnlockRequired: true,
          shouldSpeakGreetingOnUnlock: true,
          hasAttemptedInitialAutoplay: true,
          voiceLockedValid: false,
          mode: "ready",
        });
        alexLog("boot:v7:service_init_failed", error);
        return;
      }

      const state = useAlexStore.getState();
      if (state.isGreetingSpoken || !state.shouldAutoStartOnLoad) return;

      const greetingText = state.pendingGreetingText || "Bonjour.";

      // Single autoplay attempt with connecting_voice state
      try {
        // V7: connecting_voice first, not speaking
        state.startConnectingVoice();
        useAlexStore.setState({ hasAttemptedInitialAutoplay: true });
        alexLog("boot:v7:GREETING_AUDIO_CONNECTING");

        await withTimeout(
          elevenlabsService.speak(
            greetingText,
            // onStart — real audio playback confirmed
            () => {
              useAlexStore.getState().startSpeaking();
              alexLog("boot:v7:GREETING_AUDIO_STARTED");
            },
            // onEnd
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
        alexLog("boot:v7:autoplay_success");
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
        alexLog("boot:v7:autoplay_blocked_fallback", error);
        alexLog("boot:BROWSER_VOICE_FALLBACK_BLOCKED");
      }
    }, VOICE_ATTEMPT_DELAY_MS);
  }, []);
}
