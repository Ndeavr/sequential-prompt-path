// PROTECTED FILE — ALEX VOICE CORE
// Do not modify unless task explicitly says VOICE.
// Any change requires voice_smoke_test passing before deploy.
/**
 * alexVoiceConfig — Single source of truth for Alex voice settings.
 *
 * RULE: All voice surfaces (overrides builder, recovery, edge merge,
 * diagnostics) MUST read from this file. No drift between intro and
 * subsequent turns.
 */
export type AlexVoiceMode = "homeowner" | "contractor" | "condo_manager" | "general";

// ─── ALEX FEMALE-ONLY VOICE LOCK ───────────────────────────────────────────
// Single source of truth. Every TTS surface MUST read these constants.
// No male fallback. No browser speechSynthesis. No alternate voice.
export const ALEX_VOICE_MODE = "female_only" as const;
export const ALEX_TTS_PROVIDER = "elevenlabs" as const;
export const ALEX_VOICE_ID = "YxrwjAKoUKULGd0g8K9Y" as const; // Sophia — premium female concierge
export const ALEX_DISABLE_BROWSER_TTS = true as const;
export const ALEX_DISABLE_MALE_FALLBACK = true as const;

export function getAlexFemaleVoiceId(): string {
  return ALEX_VOICE_ID;
}

export const ALEX_VOICE_BASE = {
  voiceId: ALEX_VOICE_ID, // Sophia — premium concierge (active)
  modelId: "eleven_multilingual_v2",
  outputFormat: "mp3_44100_128",
} as const;

/**
 * Backup voice used by retry logic if the primary voice fails.
 * Locked to the SAME Sophia voice — we never fall back to a different voice
 * (no male, no alternate female). Only the TTS request is retried.
 */
export const ALEX_VOICE_BACKUP = {
  voiceId: ALEX_VOICE_ID,
  modelId: "eleven_multilingual_v2",
  outputFormat: "mp3_44100_128",
} as const;

export interface AlexVoiceTuning {
  stability: number;
  similarity_boost: number;
  style: number;
  use_speaker_boost: boolean;
  /** Speech rate hint (1.00 = normal). Applied via prompt cue, not raw param. */
  speed: number;
  firstMessage: string;
  promptAddendum?: string;
}

// Production tuning — LOCKED. Same for every mode, every turn.
// Do not vary per emotion, per turn, or per surface.
// Energetic premium tuning — prevents "dying / sad cadence" drift mid-session.
// Higher stability keeps pacing consistent end-to-end; low style avoids drama;
// speed locked at 1.0 (never <0.98 or >1.03).
const BASE_TUNING = {
  stability: 0.52,
  similarity_boost: 0.78,
  style: 0.30,
  use_speaker_boost: true,
  speed: 1.0,
} as const;

const HOMEOWNER: AlexVoiceTuning = {
  ...BASE_TUNING,
  firstMessage: "Bonjour. Je vous écoute.",
};

const CONTRACTOR: AlexVoiceTuning = {
  ...BASE_TUNING,
  firstMessage: "Bonjour. Je vous écoute.",
  promptAddendum:
    "Tu es conseillère stratégique calme et posée pour entrepreneurs. Confiance professionnelle, chaleur subtile. Jamais excitée, jamais bubbly, jamais théâtrale. Pose une seule question à la fois et avance vers la valeur.",
};

const CONDO: AlexVoiceTuning = {
  ...HOMEOWNER,
  firstMessage: "Bonjour. Je vous écoute.",
};

export function getVoiceConfigFor(mode: AlexVoiceMode = "general"): AlexVoiceTuning {
  switch (mode) {
    case "contractor":
      return CONTRACTOR;
    case "condo_manager":
      return CONDO;
    case "homeowner":
    case "general":
    default:
      return HOMEOWNER;
  }
}

export const ALEX_VOICE_CONFIG = {
  ...ALEX_VOICE_BASE,
  defaults: HOMEOWNER,
  modes: { homeowner: HOMEOWNER, contractor: CONTRACTOR, condo_manager: CONDO },
} as const;
