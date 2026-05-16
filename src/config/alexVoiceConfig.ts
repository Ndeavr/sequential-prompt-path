/**
 * alexVoiceConfig — Single source of truth for Alex voice settings.
 *
 * RULE: All voice surfaces (overrides builder, recovery, edge merge,
 * diagnostics) MUST read from this file. No drift between intro and
 * subsequent turns.
 */
export type AlexVoiceMode = "homeowner" | "contractor" | "condo_manager" | "general";

export const ALEX_VOICE_BASE = {
  voiceId: "or4EV8aZq78KWcXw48wd", // Alex premium concierge — locked
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
const BASE_TUNING = {
  stability: 0.50,
  similarity_boost: 0.75,
  style: 0.35,
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
