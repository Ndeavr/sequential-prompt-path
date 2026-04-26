/**
 * alexVoiceService — Central reliability layer for Alex Voice.
 *
 * Observable state machine. Subscribe to receive every transition.
 * Used by OverlayAlexVoiceFullScreen + AlexVoiceDebugPanel.
 *
 * States:
 *   idle → initializing → requesting_token → token_ready → connecting
 *   → connected → listening | speaking | thinking
 *   → reconnecting | failed | fallback_chat
 */

export type AlexVoiceState =
  | "idle"
  | "initializing"
  | "requesting_token"
  | "token_ready"
  | "connecting"
  | "connected"
  | "listening"
  | "thinking"
  | "speaking"
  | "reconnecting"
  | "failed"
  | "fallback_chat";

export type MicPermission = "prompt" | "granted" | "denied";

export interface AlexVoiceServiceSnapshot {
  state: AlexVoiceState;
  lastError: string | null;
  retryCount: number;
  latencyMs: number | null;
  tokenReceived: boolean;
  wsConnected: boolean;
  micPermission: MicPermission;
  audioUnlocked: boolean;
  apiKeyConfigured: boolean | null; // null = unknown
  updatedAt: number;
}

const DEFAULT: AlexVoiceServiceSnapshot = {
  state: "idle",
  lastError: null,
  retryCount: 0,
  latencyMs: null,
  tokenReceived: false,
  wsConnected: false,
  micPermission: "prompt",
  audioUnlocked: false,
  apiKeyConfigured: null,
  updatedAt: Date.now(),
};

type Listener = (snap: AlexVoiceServiceSnapshot) => void;

class AlexVoiceServiceImpl {
  private snap: AlexVoiceServiceSnapshot = { ...DEFAULT };
  private listeners = new Set<Listener>();
  private tokenStartedAt = 0;

  getSnapshot(): AlexVoiceServiceSnapshot {
    return this.snap;
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private update(patch: Partial<AlexVoiceServiceSnapshot>) {
    this.snap = { ...this.snap, ...patch, updatedAt: Date.now() };
    this.listeners.forEach((l) => {
      try { l(this.snap); } catch (e) { console.warn("[ALEX VOICE] listener error", e); }
    });
  }

  setState(state: AlexVoiceState, reason?: string) {
    if (this.snap.state === state) return;
    console.log(`[ALEX VOICE] ${state}${reason ? ` (${reason})` : ""}`);
    this.update({ state });
  }

  setError(message: string, code?: string) {
    console.error(`[ALEX VOICE ERROR] ${code || "unknown"}: ${message}`);
    this.update({ lastError: message, state: "failed" });
  }

  clearError() {
    this.update({ lastError: null });
  }

  startTokenRequest() {
    this.tokenStartedAt = Date.now();
    this.setState("requesting_token", "edge_call_started");
  }

  markTokenReceived() {
    const latency = this.tokenStartedAt > 0 ? Date.now() - this.tokenStartedAt : null;
    this.update({
      tokenReceived: true,
      latencyMs: latency,
      state: "token_ready",
    });
    console.log(`[ALEX VOICE] token received (${latency}ms)`);
  }

  markWsConnected(ok: boolean) {
    this.update({ wsConnected: ok });
    if (ok) console.log("[ALEX VOICE] connected");
  }

  setMicPermission(perm: MicPermission) {
    this.update({ micPermission: perm });
    console.log(`[ALEX VOICE] mic permission ${perm}`);
  }

  setAudioUnlocked(unlocked: boolean) {
    this.update({ audioUnlocked: unlocked });
    if (unlocked) console.log("[ALEX VOICE] audio context resumed");
  }

  setApiKeyConfigured(ok: boolean) {
    this.update({ apiKeyConfigured: ok });
  }

  incrementRetry() {
    const r = this.snap.retryCount + 1;
    this.update({ retryCount: r, state: "reconnecting" });
    console.log(`[ALEX VOICE] reconnecting (attempt ${r})`);
    return r;
  }

  switchToFallbackChat(reason: string) {
    console.log(`[ALEX VOICE] fallback chat (${reason})`);
    this.update({ state: "fallback_chat" });
  }

  reset() {
    this.snap = { ...DEFAULT, updatedAt: Date.now() };
    this.tokenStartedAt = 0;
    this.listeners.forEach((l) => l(this.snap));
  }
}

export const alexVoiceService = new AlexVoiceServiceImpl();

// React hook (lightweight, no extra deps)
import { useSyncExternalStore } from "react";

export function useAlexVoiceServiceSnapshot(): AlexVoiceServiceSnapshot {
  return useSyncExternalStore(
    (cb) => alexVoiceService.subscribe(cb),
    () => alexVoiceService.getSnapshot(),
    () => alexVoiceService.getSnapshot(),
  );
}
