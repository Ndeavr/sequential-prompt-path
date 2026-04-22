/**
 * Alex 100M — Zustand Store
 * V7: connecting_voice mode, verified identity flags.
 */

import { create } from "zustand";
import type {
  AlexMode,
  AlexLanguage,
  AlexUserRole,
  AlexIntent,
  AlexMessage,
  AlexQuickAction,
  AlexSpotlight,
  AlexDebugEntry,
} from "../types/alex.types";
import { alexLog } from "../utils/alexDebug";

// ─── State Shape ──────────────────────────────────────────────────

export interface AlexState {
  mode: AlexMode;
  messages: AlexMessage[];

  isInitialized: boolean;
  isSessionRestored: boolean;
  isVoiceEnabled: boolean;
  isVoiceAvailable: boolean;
  isSTTAvailable: boolean;
  isAudioUnlocked: boolean;
  isAutoplayAllowed: boolean | null;
  isGreetingInjected: boolean;
  isGreetingSpoken: boolean;
  isUserEngaged: boolean;
  isMicOpen: boolean;
  isUserSpeaking: boolean;
  isBackgroundNoise: boolean;
  hasLowConfidenceAudio: boolean;
  hasPendingAssistantTurn: boolean;
  hasActivePlayback: boolean;
  hasActiveTTSRequest: boolean;
  hasActiveSTTSession: boolean;
  shouldAutoStartOnLoad: boolean;
  shouldMinimizeOnInactivity: boolean;
  shouldClosePanelOnInactivity: boolean;

  // V6 — greeting unlock flags
  audioUnlockRequired: boolean;
  pendingGreetingText: string | null;
  shouldSpeakGreetingOnUnlock: boolean;
  hasAttemptedInitialAutoplay: boolean;

  // V7 — verified identity
  verifiedGreetingName: string | null;
  identityMismatchDetected: boolean;
  openingLanguageLocked: boolean;
  voiceLockedValid: boolean;

  consecutiveNoResponseCount: number;
  autoRepromptCount: number;
  interactionCount: number;

  lastUserActivityAt: number | null;
  lastAssistantMessageAt: number | null;
  lastAssistantQuestionAt: number | null;
  lastValidUserInputAt: number | null;

  sessionId: string | null;
  activeLanguage: AlexLanguage;
  userRole: AlexUserRole;
  currentIntent: AlexIntent;
  currentProjectType: string | null;

  quickActions: AlexQuickAction[];
  spotlight: AlexSpotlight | null;
  softPromptText: string | null;

  debugLog: AlexDebugEntry[];
}

// ─── Actions ──────────────────────────────────────────────────────

export interface AlexActions {
  bootstrapStart: () => void;
  bootstrapSuccess: (sessionId: string) => void;
  bootstrapFailure: () => void;

  setMode: (mode: AlexMode) => void;

  injectAssistantMessage: (text: string, isSpoken?: boolean) => void;
  addUserMessage: (text: string, intent?: AlexIntent) => void;

  markUserEngaged: () => void;
  incrementNoResponse: () => void;
  resetNoResponse: () => void;
  incrementAutoReprompt: () => void;
  resetAutoReprompt: () => void;

  openMic: () => void;
  closeMic: () => void;
  startConnectingVoice: () => void;
  startSpeaking: () => void;
  stopSpeaking: () => void;
  startListening: () => void;
  stopListening: () => void;

  markNoiseDetected: () => void;
  markLowConfidenceAudio: () => void;

  minimizeAssistant: () => void;
  restoreAssistant: () => void;

  showSoftPrompt: (text: string) => void;
  clearSoftPrompt: () => void;

  showQuickActions: (actions: AlexQuickAction[]) => void;
  setSpotlight: (spotlight: AlexSpotlight) => void;
  clearSpotlight: () => void;

  startImageAnalysis: () => void;
  finishImageAnalysis: () => void;

  setLanguage: (lang: AlexLanguage) => void;
  setUserRole: (role: AlexUserRole) => void;
  setIntent: (intent: AlexIntent) => void;
  setAutoplayAllowed: (v: boolean) => void;
  setAudioUnlocked: (v: boolean) => void;

  logDebug: (tag: string, payload?: unknown) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────

function makeId(): string {
  return crypto.randomUUID();
}

const now = () => Date.now();

export const DEFAULT_ALEX_QUICK_ACTIONS: AlexQuickAction[] = [
  { key: "homeowner_problem", labelFr: "Décrire un problème", labelEn: "Describe a problem", intent: "homeowner_problem", icon: "🏠" },
  { key: "photo_upload", labelFr: "Envoyer une photo", labelEn: "Send a photo", intent: "photo_upload", icon: "📷" },
  { key: "quote_compare", labelFr: "Comparer des soumissions", labelEn: "Compare quotes", intent: "quote_compare", icon: "📊" },
  { key: "find_contractor", labelFr: "Trouver un entrepreneur", labelEn: "Find a contractor", intent: "booking", icon: "🔎" },
  { key: "contractor_onboarding", labelFr: "Je suis un entrepreneur", labelEn: "I'm a contractor", intent: "contractor_onboarding", icon: "🔧" },
];

// ─── Store ────────────────────────────────────────────────────────

export const useAlexStore = create<AlexState & AlexActions>()((set) => ({
  mode: "booting",
  messages: [],

  isInitialized: false,
  isSessionRestored: false,
  isVoiceEnabled: true,
  isVoiceAvailable: false,
  isSTTAvailable: false,
  isAudioUnlocked: false,
  isAutoplayAllowed: null,
  isGreetingInjected: false,
  isGreetingSpoken: false,
  isUserEngaged: false,
  isMicOpen: false,
  isUserSpeaking: false,
  isBackgroundNoise: false,
  hasLowConfidenceAudio: false,
  hasPendingAssistantTurn: false,
  hasActivePlayback: false,
  hasActiveTTSRequest: false,
  hasActiveSTTSession: false,
  shouldAutoStartOnLoad: true,
  shouldMinimizeOnInactivity: true,
  shouldClosePanelOnInactivity: false,

  // V6 flags
  audioUnlockRequired: false,
  pendingGreetingText: null,
  shouldSpeakGreetingOnUnlock: false,
  hasAttemptedInitialAutoplay: false,

  // V7 flags
  verifiedGreetingName: null,
  identityMismatchDetected: false,
  openingLanguageLocked: false,
  voiceLockedValid: true,

  consecutiveNoResponseCount: 0,
  autoRepromptCount: 0,
  interactionCount: 0,

  lastUserActivityAt: null,
  lastAssistantMessageAt: null,
  lastAssistantQuestionAt: null,
  lastValidUserInputAt: null,

  sessionId: null,
  activeLanguage: "fr-CA",
  userRole: "unknown",
  currentIntent: "unknown",
  currentProjectType: null,

  quickActions: DEFAULT_ALEX_QUICK_ACTIONS,
  spotlight: null,
  softPromptText: null,

  debugLog: [],

  // ─── Actions ──────────────────────────────────────────────────

  bootstrapStart: () => {
    alexLog("store:bootstrapStart");
    set({ mode: "booting", isInitialized: false });
  },

  bootstrapSuccess: (sessionId) => {
    alexLog("store:bootstrapSuccess", { sessionId });
    set({
      mode: "ready",
      isInitialized: true,
      sessionId,
    });
  },

  bootstrapFailure: () => {
    alexLog("store:bootstrapFailure");
    set({ mode: "ready", isInitialized: true, isAutoplayAllowed: false });
  },

  setMode: (mode) => {
    alexLog("store:setMode", { mode });
    set({ mode });
  },

  injectAssistantMessage: (text, isSpoken = false) => {
    const msg: AlexMessage = {
      id: makeId(),
      role: "assistant",
      text,
      timestamp: now(),
      isSpoken,
    };
    alexLog("store:assistantMsg", { text: text.slice(0, 60) });
    set((s) => ({
      messages: [...s.messages, msg],
      lastAssistantMessageAt: now(),
      isGreetingInjected: true,
    }));
  },

  addUserMessage: (text, intent) => {
    const msg: AlexMessage = {
      id: makeId(),
      role: "user",
      text,
      timestamp: now(),
      intent,
    };
    alexLog("store:userMsg", { text: text.slice(0, 60), intent });
    set((s) => ({
      messages: [...s.messages, msg],
      lastUserActivityAt: now(),
      lastValidUserInputAt: now(),
      interactionCount: s.interactionCount + 1,
      isUserEngaged: true,
      consecutiveNoResponseCount: 0,
      currentIntent: intent ?? s.currentIntent,
    }));
  },

  markUserEngaged: () => {
    set({ isUserEngaged: true, lastUserActivityAt: now() });
  },

  incrementNoResponse: () => {
    set((s) => ({
      consecutiveNoResponseCount: s.consecutiveNoResponseCount + 1,
    }));
  },

  resetNoResponse: () => set({ consecutiveNoResponseCount: 0 }),

  incrementAutoReprompt: () => {
    set((s) => ({ autoRepromptCount: s.autoRepromptCount + 1 }));
  },

  resetAutoReprompt: () => set({ autoRepromptCount: 0 }),

  openMic: () => set({ isMicOpen: true }),
  closeMic: () => set({ isMicOpen: false, isUserSpeaking: false }),

  // V7: connecting_voice — TTS request sent, no audio yet
  startConnectingVoice: () => set({ mode: "connecting_voice", hasActiveTTSRequest: true }),

  // V7: speaking — only when audio playback actually started
  startSpeaking: () => set({ mode: "speaking", hasActivePlayback: true, hasActiveTTSRequest: false }),
  stopSpeaking: () =>
    set((s) => ({
      mode: s.mode === "speaking" || s.mode === "connecting_voice" ? "ready" : s.mode,
      hasActivePlayback: false,
      hasActiveTTSRequest: false,
    })),

  startListening: () =>
    set({ mode: "listening", hasActiveSTTSession: true, isMicOpen: true }),
  stopListening: () =>
    set((s) => ({
      mode: s.mode === "listening" ? "ready" : s.mode,
      hasActiveSTTSession: false,
    })),

  markNoiseDetected: () =>
    set({ isBackgroundNoise: true, mode: "noise_detected" }),
  markLowConfidenceAudio: () =>
    set({ hasLowConfidenceAudio: true, mode: "low_confidence_audio" }),

  minimizeAssistant: () => {
    alexLog("store:minimize");
    set({ mode: "minimized", isMicOpen: false });
  },

  restoreAssistant: () => {
    alexLog("store:restore");
    set({ mode: "ready" });
  },

  showSoftPrompt: (text) =>
    set({ softPromptText: text, mode: "soft_prompt_visible" }),
  clearSoftPrompt: () =>
    set((s) => ({
      softPromptText: null,
      mode: s.mode === "soft_prompt_visible" ? "ready" : s.mode,
    })),

  showQuickActions: (actions) => set({ quickActions: actions }),

  setSpotlight: (spotlight) =>
    set({ spotlight, mode: "guiding_ui" }),
  clearSpotlight: () =>
    set((s) => ({
      spotlight: null,
      mode: s.mode === "guiding_ui" ? "ready" : s.mode,
    })),

  startImageAnalysis: () => set({ mode: "analyzing_image" }),
  finishImageAnalysis: () => set({ mode: "ready" }),

  setLanguage: (lang) => set({ activeLanguage: lang }),
  setUserRole: (role) => set({ userRole: role }),
  setIntent: (intent) => set({ currentIntent: intent }),
  setAutoplayAllowed: (v) => set({ isAutoplayAllowed: v }),
  setAudioUnlocked: (v) => set({ isAudioUnlocked: v }),

  logDebug: (tag, payload) => {
    alexLog(tag, payload);
    set((s) => ({
      debugLog: [
        ...s.debugLog.slice(-199),
        { ts: now(), tag, payload },
      ],
    }));
  },
}));
