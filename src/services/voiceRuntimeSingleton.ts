/**
 * Voice Runtime Singleton — Global lock preventing duplicate voice sessions.
 * 
 * RULE: Only ONE voice session can exist at any time.
 * Any new session must first kill the existing one completely.
 */

interface VoiceRuntimeState {
  activeSessionId: string | null;
  transportId: string | null;
  audioPipelineId: string | null;
  isResetting: boolean;
  isRecovering: boolean;
  lastResetAt: number | null;
}

const GLOBAL_KEY = '__UNPRO_ALEX_VOICE_RUNTIME__';

function getRuntime(): VoiceRuntimeState {
  if (!(window as any)[GLOBAL_KEY]) {
    (window as any)[GLOBAL_KEY] = {
      activeSessionId: null,
      transportId: null,
      audioPipelineId: null,
      isResetting: false,
      isRecovering: false,
      lastResetAt: null,
    };
  }
  return (window as any)[GLOBAL_KEY];
}

export function lockRuntime(sessionId: string): boolean {
  const rt = getRuntime();
  if (rt.isResetting) {
    console.warn('[VoiceRuntime] Cannot lock — reset in progress');
    return false;
  }
  if (rt.activeSessionId && rt.activeSessionId !== sessionId) {
    console.warn('[VoiceRuntime] Another session active:', rt.activeSessionId);
    return false;
  }
  rt.activeSessionId = sessionId;
  rt.transportId = crypto.randomUUID();
  rt.audioPipelineId = crypto.randomUUID();
  return true;
}

export function unlockRuntime(): void {
  const rt = getRuntime();
  rt.activeSessionId = null;
  rt.transportId = null;
  rt.audioPipelineId = null;
}

export function setResetting(v: boolean): void {
  const rt = getRuntime();
  rt.isResetting = v;
  if (v) rt.lastResetAt = Date.now();
}

export function setRecovering(v: boolean): void {
  getRuntime().isRecovering = v;
}

export function isResetting(): boolean {
  return getRuntime().isResetting;
}

export function isRecovering(): boolean {
  return getRuntime().isRecovering;
}

export function getActiveSessionId(): string | null {
  return getRuntime().activeSessionId;
}

export function getRuntimeSnapshot(): VoiceRuntimeState {
  return { ...getRuntime() };
}
