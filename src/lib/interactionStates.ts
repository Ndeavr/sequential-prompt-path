/**
 * Universal Interaction State Machine — single vocabulary for vault interactions.
 *
 *   idle → scanning → adjusting → locked → opening → success
 *                                                  ↳ error
 *
 * `run(asyncFn)` orchestrates the full sequence around an async action.
 */
export type InteractionState =
  | "idle"
  | "scanning"
  | "adjusting"
  | "locked"
  | "opening"
  | "success"
  | "error";

export const INTERACTION_STATE_TIMINGS = {
  scanning: 280,
  opening: 240,
  success: 1200,
  error: 1400,
} as const;
