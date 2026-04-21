/**
 * Alex 100M — Core Type Definitions
 * Premium French-first female AI assistant for UNPRO
 */

// ─── Mode State Machine ───────────────────────────────────────────
export type AlexMode =
  | "booting"
  | "ready"
  | "speaking"
  | "listening"
  | "thinking"
  | "waiting_for_reply"
  | "soft_prompt_visible"
  | "noise_detected"
  | "low_confidence_audio"
  | "guiding_ui"
  | "analyzing_image"
  | "showing_options"
  | "closing_due_to_inactivity"
  | "minimized"
  | "fallback_text"
  | "error";

// ─── Language ─────────────────────────────────────────────────────
export type AlexLanguage = "fr-CA" | "en";

// ─── Roles ────────────────────────────────────────────────────────
export type AlexUserRole =
  | "homeowner"
  | "contractor"
  | "condo_manager"
  | "admin"
  | "unknown";

// ─── Intent ───────────────────────────────────────────────────────
export type AlexIntent =
  | "homeowner_problem"
  | "photo_upload"
  | "quote_compare"
  | "contractor_onboarding"
  | "booking"
  | "unknown";

// ─── Noise Gate Classification ────────────────────────────────────
export type NoiseGateResult =
  | "valid_input"
  | "low_confidence"
  | "background_noise";

// ─── Message ──────────────────────────────────────────────────────
export type AlexMessageRole = "assistant" | "user" | "system";

export interface AlexMessage {
  id: string;
  role: AlexMessageRole;
  text: string;
  timestamp: number;
  intent?: AlexIntent;
  language?: AlexLanguage;
  isSpoken?: boolean;
  meta?: Record<string, unknown>;
}

// ─── Quick Action ─────────────────────────────────────────────────
export interface AlexQuickAction {
  key: string;
  labelFr: string;
  labelEn: string;
  intent: AlexIntent;
  icon?: string;
}

// ─── Spotlight ────────────────────────────────────────────────────
export interface AlexSpotlight {
  targetSelector: string;
  labelFr: string;
  labelEn: string;
  pulse?: boolean;
}

// ─── STT Event ────────────────────────────────────────────────────
export interface STTTranscriptEvent {
  text: string;
  confidence: number;
  durationMs: number;
  isFinal: boolean;
}

// ─── TTS Status ───────────────────────────────────────────────────
export type TTSStatus = "idle" | "loading" | "playing" | "error";

// ─── Session Snapshot (for persistence / resume) ──────────────────
export interface AlexSessionSnapshot {
  sessionId: string;
  language: AlexLanguage;
  userRole: AlexUserRole;
  currentIntent: AlexIntent;
  messages: AlexMessage[];
  interactionCount: number;
  timestamp: number;
}

// ─── Debug Entry ──────────────────────────────────────────────────
export interface AlexDebugEntry {
  ts: number;
  tag: string;
  payload?: unknown;
}

// ─── Conversation Engine Response ─────────────────────────────────
export interface AlexConversationResponse {
  text: string;
  speak: boolean;
  quickActions?: AlexQuickAction[];
  spotlight?: AlexSpotlight;
  intent?: AlexIntent;
  shouldMinimize?: boolean;
}
