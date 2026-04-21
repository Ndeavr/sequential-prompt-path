/**
 * Alex 100M — Guards
 * Deterministic checks for state transitions & safety.
 */

import type { AlexMode } from "../types/alex.types";
import {
  MAX_NO_RESPONSE_BEFORE_MINIMIZE,
  MAX_AUTO_REPROMPTS,
} from "./alexTimers";

/** Modes where Alex is actively producing audio output */
const AUDIO_OUTPUT_MODES: AlexMode[] = ["speaking", "booting"];

/** Modes where the mic should NOT be opened */
const MIC_BLOCKED_MODES: AlexMode[] = [
  "speaking",
  "booting",
  "error",
  "minimized",
  "closing_due_to_inactivity",
];

/** Modes from which we can transition to listening */
const CAN_LISTEN_FROM: AlexMode[] = [
  "ready",
  "waiting_for_reply",
  "soft_prompt_visible",
  "noise_detected",
  "low_confidence_audio",
  "showing_options",
];

export function canOpenMic(mode: AlexMode): boolean {
  return !MIC_BLOCKED_MODES.includes(mode);
}

export function canStartListening(mode: AlexMode): boolean {
  return CAN_LISTEN_FROM.includes(mode);
}

export function isAudioOutputActive(mode: AlexMode): boolean {
  return AUDIO_OUTPUT_MODES.includes(mode);
}

export function shouldAutoMinimize(
  consecutiveNoResponseCount: number,
  autoRepromptCount: number,
): boolean {
  return (
    consecutiveNoResponseCount >= MAX_NO_RESPONSE_BEFORE_MINIMIZE &&
    autoRepromptCount >= MAX_AUTO_REPROMPTS
  );
}

export function canAutoReprompt(autoRepromptCount: number): boolean {
  return autoRepromptCount < MAX_AUTO_REPROMPTS;
}

export function isInteractiveMode(mode: AlexMode): boolean {
  return !["booting", "error", "minimized", "closing_due_to_inactivity"].includes(mode);
}

export function isForbiddenPrompt(text: string): boolean {
  const forbidden = [
    "êtes-vous là",
    "avez-vous toujours besoin de moi",
    "êtes-vous encore là",
    "are you still there",
    "hello?",
  ];
  const lower = text.toLowerCase().trim();
  return forbidden.some((f) => lower.includes(f));
}
