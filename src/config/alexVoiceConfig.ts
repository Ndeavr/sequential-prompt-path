/**
 * alexVoiceConfig — Single source of truth for Alex voice settings.
 *
 * RULE: All voice surfaces (overrides builder, recovery, edge merge,
 * diagnostics) MUST read from this file. No drift between intro and
 * subsequent turns.
 */
export type AlexVoiceMode = "homeowner" | "contractor" | "condo_manager" | "general";

export const ALEX_VOICE_BASE = {
  voiceId: "YxrwjAKoUKULGd0g8K9Y", // Sophia — premium concierge (active)
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
  firstMessage: "Bonjour. Je suis Alex d'Un Pro. Quel problème puis-je vous aider à régler aujourd'hui?",
};

const CONTRACTOR: AlexVoiceTuning = {
  ...BASE_TUNING,
  firstMessage: "Bonjour. Je suis Alex d'Un Pro. Voyons ensemble comment faire évoluer votre entreprise.",
  promptAddendum:
    "Tu es conseillère stratégique calme et posée pour entrepreneurs. Confiance professionnelle, chaleur subtile. Jamais excitée, jamais bubbly, jamais théâtrale. Pose une seule question à la fois et avance vers la valeur.",
};

const CONDO: AlexVoiceTuning = {
  ...HOMEOWNER,
  firstMessage: "Bonjour. Je suis Alex d'Un Pro. Décrivez la situation dans votre immeuble.",
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
