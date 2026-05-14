/**
 * alexAgentOverrides — Builds the ElevenLabs Conversational AI override payload.
 *
 * Single source of truth for voice tuning is `src/config/alexVoiceConfig.ts`.
 * Per-mode tuning (homeowner / contractor / condo_manager) is applied here.
 *
 * IMPORTANT: For these overrides to take effect, they MUST be enabled in the
 * ElevenLabs agent dashboard (Security → Overrides).
 */
import { buildAlexFirstMessage } from "./alexSystemPromptV2";
import { ALEX_CORE_PROMPT } from "./alexCorePrompt";
import { getVoiceConfigFor, ALEX_VOICE_BASE, type AlexVoiceMode } from "@/config/alexVoiceConfig";

export type AlexLanguage = "fr" | "en";

export interface BuildOverridesInput {
  firstName?: string | null;
  isReturning?: boolean;
  language?: AlexLanguage;
  /** Surface mode — drives tuning + first message + persona addendum. */
  mode?: AlexVoiceMode;
  voiceId?: string | null;
  stability?: number | null;
  similarity?: number | null;
  style?: number | null;
  speakerBoost?: boolean | null;
  contextHint?: string | null;
}

// Back-compat export (some callers still import ALEX_VOICE_DEFAULTS).
export const ALEX_VOICE_DEFAULTS = {
  voiceId: ALEX_VOICE_BASE.voiceId,
  stability: getVoiceConfigFor("homeowner").stability,
  similarity: getVoiceConfigFor("homeowner").similarity_boost,
  style: getVoiceConfigFor("homeowner").style,
  speakerBoost: getVoiceConfigFor("homeowner").use_speaker_boost,
} as const;

export function buildAlexAgentOverrides(input: BuildOverridesInput) {
  const language: AlexLanguage = input.language ?? "fr";
  const mode: AlexVoiceMode = input.mode ?? "general";
  const tuning = getVoiceConfigFor(mode);

  const basePrompt = input.contextHint
    ? `${ALEX_CORE_PROMPT}\n\n# CONTEXTE\n${input.contextHint.trim()}`
    : ALEX_CORE_PROMPT;
  const prompt = tuning.promptAddendum
    ? `${basePrompt}\n\n# PERSONA MODE\n${tuning.promptAddendum}`
    : basePrompt;

  // Use mode-specific first message unless caller forced a personalized greeting via firstName.
  const firstMessage = input.firstName
    ? buildAlexFirstMessage({
        firstName: input.firstName,
        isReturning: input.isReturning,
        language,
      })
    : tuning.firstMessage;

  const voiceId = input.voiceId ?? ALEX_VOICE_BASE.voiceId;
  const stability = input.stability ?? tuning.stability;
  const similarity_boost = input.similarity ?? tuning.similarity_boost;
  const style = input.style ?? tuning.style;
  const use_speaker_boost = input.speakerBoost ?? tuning.use_speaker_boost;

  return {
    agent: {
      prompt: { prompt },
      firstMessage,
      language,
    },
    tts: {
      voiceId,
      modelId: ALEX_VOICE_BASE.modelId,
      stability,
      similarity_boost,
      style,
      use_speaker_boost,
      speed: tuning.speed,
    },
  };
}
