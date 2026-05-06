/**
 * Alex Hard Recovery — Single source of truth for fail-safe voice recovery.
 *
 * Rules:
 * - Never let Alex stay in a loading/connecting state.
 * - On any voice failure: stop audio, reset flags, optionally open chat.
 * - Throttle voice retries; auto-disable after 3 failures in 2 min.
 */

import { useAlexStore } from "../state/alexStore";
import { elevenlabsService } from "./elevenlabsService";
import { sttService } from "./sttService";
import { useAlexVoiceLockedStore } from "@/stores/alexVoiceLockedStore";
import { useAlexChatFallbackStore } from "@/stores/alexChatFallbackStore";
import { alexLog } from "../utils/alexDebug";

export const TTS_TIMEOUT_MS = 8000;
export const TTS_SLOW_MS = 6000;
export const ALEX_FROZEN_MS = 10000;
export const MAX_TTS_RETRIES = 1;

export function isVoiceTemporarilyDisabled(): boolean {
  const s = useAlexStore.getState();
  return !!(s.voiceDisabledUntil && s.voiceDisabledUntil > Date.now());
}

export function hardResetAlexSession(reason: string): void {
  alexLog("[ALEX_HARD_RESET]", { reason });

  // 1. Kill TTS audio + in-flight request
  try { elevenlabsService.stop(); } catch {}

  // 2. Kill STT
  try { sttService.stop(); sttService.unsubscribe(); } catch {}

  // 3. Force close locked overlay (bypass stabilization)
  try {
    const locked = useAlexVoiceLockedStore.getState();
    if (locked.isOverlayOpen) {
      locked.closeVoiceSession("user_explicit_close");
    }
  } catch {}

  // 4. Dispatch global cleanup signals
  try { window.dispatchEvent(new CustomEvent("alex-voice-force-kill", { detail: { reason } })); } catch {}
  try { window.dispatchEvent(new CustomEvent("alex-voice-cleanup")); } catch {}

  // 5. Reset Alex store
  useAlexStore.getState().hardReset(reason);
}

export function switchAlexToChatFallback(reason: string, message?: string): void {
  hardResetAlexSession(reason);
  useAlexStore.getState().markVoiceUnavailable(reason, message);
  try {
    useAlexChatFallbackStore.getState().open(reason);
  } catch {}
}

export function recordVoiceFailure(reason: string): void {
  const store = useAlexStore.getState();
  store.recordVoiceFailure();
  if (isVoiceTemporarilyDisabled()) {
    alexLog("voice:disabled_chat_only", { reason, untilMs: store.voiceDisabledUntil });
  }
}

export async function recoverAlex(): Promise<void> {
  alexLog("[ALEX_RECOVER]");
  hardResetAlexSession("user_recover");
  useAlexStore.setState({
    voiceUnavailableReason: null,
    recoveryNotice: null,
    voiceErrorTimestamps: [],
    voiceDisabledUntil: null,
    audioUnlockRequired: true,
    shouldSpeakGreetingOnUnlock: false,
  });
}
