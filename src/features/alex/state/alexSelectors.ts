/**
 * Alex 100M — Selectors
 * Derived state from the Zustand store.
 */

import type { AlexState } from "./alexStore";

/** Is Alex fully booted and ready for interaction? */
export const selectIsReady = (s: AlexState) => s.isInitialized && s.mode !== "booting" && s.mode !== "error";

/** Is Alex in any interactive mode (not minimized/error/closing)? */
export const selectIsActive = (s: AlexState) =>
  !["minimized", "error", "closing_due_to_inactivity", "booting"].includes(s.mode);

/** Is voice available and unlocked? */
export const selectCanSpeak = (s: AlexState) =>
  s.isVoiceAvailable && s.isAudioUnlocked && !s.hasActivePlayback;

/** Can the mic be opened right now? */
export const selectCanListen = (s: AlexState) =>
  s.isSTTAvailable && !s.hasActivePlayback && s.mode !== "speaking" && s.mode !== "connecting_voice" && s.mode !== "booting" && s.mode !== "error" && s.mode !== "minimized";

/** Should we show the soft prompt overlay? */
export const selectShowSoftPrompt = (s: AlexState) =>
  s.mode === "soft_prompt_visible" && !!s.softPromptText;

/** Should we show quick actions? */
export const selectShowQuickActions = (s: AlexState) =>
  s.quickActions.length > 0;

/** Should we show the spotlight overlay? */
export const selectHasSpotlight = (s: AlexState) => !!s.spotlight;

/** Is the assistant in a reduced/minimized state? */
export const selectIsMinimized = (s: AlexState) => s.mode === "minimized";

/** Is Alex currently speaking? */
export const selectIsSpeaking = (s: AlexState) => s.mode === "speaking";

/** Is Alex connecting voice (TTS request sent, waiting for audio)? */
export const selectIsConnectingVoice = (s: AlexState) => s.mode === "connecting_voice";

/** Is Alex currently listening? */
export const selectIsListening = (s: AlexState) => s.mode === "listening";

/** Is Alex thinking (processing a response)? */
export const selectIsThinking = (s: AlexState) => s.mode === "thinking";

/** Is Alex analyzing an image? */
export const selectIsAnalyzingImage = (s: AlexState) => s.mode === "analyzing_image";

/** Has the user engaged at all this session? */
export const selectHasUserEngaged = (s: AlexState) => s.isUserEngaged;

/** Get assistant messages only */
export const selectAssistantMessages = (s: AlexState) =>
  s.messages.filter((m) => m.role === "assistant");

/** Get user messages only */
export const selectUserMessages = (s: AlexState) =>
  s.messages.filter((m) => m.role === "user");

/** Get the last message regardless of role */
export const selectLastMessage = (s: AlexState) =>
  s.messages.length > 0 ? s.messages[s.messages.length - 1] : null;

/** Current mode label for UI display */
export const selectModeLabel = (s: AlexState): string => {
  const labels: Record<string, { fr: string; en: string }> = {
    booting: { fr: "Chargement…", en: "Loading…" },
    ready: { fr: "Alex en direct", en: "Alex live" },
    connecting_voice: { fr: "Connexion…", en: "Connecting…" },
    speaking: { fr: "Alex parle…", en: "Alex speaking…" },
    listening: { fr: "Je vous écoute", en: "Listening" },
    thinking: { fr: "Réflexion…", en: "Thinking…" },
    waiting_for_reply: { fr: "En attente", en: "Waiting" },
    soft_prompt_visible: { fr: "Alex en direct", en: "Alex live" },
    noise_detected: { fr: "Bruit détecté", en: "Noise detected" },
    low_confidence_audio: { fr: "Parlez plus clairement", en: "Speak more clearly" },
    guiding_ui: { fr: "Je vous montre", en: "Guiding" },
    analyzing_image: { fr: "Analyse en cours…", en: "Analyzing…" },
    showing_options: { fr: "Vos options", en: "Your options" },
    closing_due_to_inactivity: { fr: "Fermeture…", en: "Closing…" },
    minimized: { fr: "Alex réduite", en: "Alex minimized" },
    fallback_text: { fr: "Écrivez à Alex", en: "Write to Alex" },
    error: { fr: "Erreur", en: "Error" },
  };
  const entry = labels[s.mode] ?? labels.ready;
  return s.activeLanguage === "fr-CA" ? entry.fr : entry.en;
};
