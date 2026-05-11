/**
 * alexVoiceConfig — Single source of truth for Alex voice settings.
 *
 * RULE: All voice surfaces (overrides builder, recovery, edge merge,
 * diagnostics) MUST read from this file. No drift between intro and
 * subsequent turns.
 */
export type AlexVoiceMode = "homeowner" | "contractor" | "condo_manager" | "general";

export const ALEX_VOICE_BASE = {
  voiceId: "UJCi4DDncuo0VJDSIegj", // Charlotte FR — locked
  modelId: "eleven_multilingual_v2",
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

const HOMEOWNER: AlexVoiceTuning = {
  stability: 0.56,
  similarity_boost: 0.84,
  style: 0.14,
  use_speaker_boost: true,
  speed: 1.0,
  firstMessage: "Bonjour. Je suis Alex d'Un Pro. Quel problème puis-je vous aider à régler aujourd'hui?",
};

const CONTRACTOR: AlexVoiceTuning = {
  stability: 0.42,
  similarity_boost: 0.82,
  style: 0.32,
  use_speaker_boost: true,
  speed: 1.10,
  firstMessage: "Bonjour. Je suis Alex d'Un Pro. Voyons ensemble comment faire évoluer votre entreprise.",
  promptAddendum:
    "Tu es conseillère stratégique de croissance pour entrepreneurs. Énergie confiante, optimiste, premium. Rythme légèrement plus rapide. Jamais vendeuse, jamais robotique. Pose une seule question à la fois et avance vite vers la valeur.",
};

const CONDO: AlexVoiceTuning = {
  ...HOMEOWNER,
  firstMessage: "Bonjour. Je suis Alex d'UNPRO. Décrivez la situation dans votre immeuble.",
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
