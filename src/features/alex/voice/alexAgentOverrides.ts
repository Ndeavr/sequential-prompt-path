/**
 * alexAgentOverrides — Builds the ElevenLabs Conversational AI override payload.
 *
 * IMPORTANT: For these overrides to take effect, they MUST be enabled in the
 * ElevenLabs agent dashboard (Security → Overrides):
 *   - agent.prompt
 *   - agent.firstMessage
 *   - agent.language
 *   - tts.voiceId
 *   - tts voice settings (stability, similarity_boost, style, use_speaker_boost)
 *
 * If an override is not enabled, ElevenLabs silently ignores it and uses the
 * agent's saved value. We log a warning if we detect a mismatch.
 */
import { buildAlexFirstMessage } from "./alexSystemPromptV2";
import { ALEX_CORE_PROMPT } from "./alexCorePrompt";

export type AlexLanguage = "fr" | "en";

export interface BuildOverridesInput {
  firstName?: string | null;
  isReturning?: boolean;
  language?: AlexLanguage;
  voiceId?: string | null;
  /** Voice tuning from voice_configs (V2 defaults applied if missing). */
  stability?: number | null;
  similarity?: number | null;
  style?: number | null;
  speakerBoost?: boolean | null;
  /** Optional contextual hint (e.g. memory recap) appended to system prompt. */
  contextHint?: string | null;
}

export const ALEX_VOICE_DEFAULTS = {
  voiceId: "UJCi4DDncuo0VJDSIegj", // Charlotte FR — Alex premium female
  stability: 0.56,
  similarity: 0.84,
  style: 0.14,
  speakerBoost: true,
} as const;

/**
 * Build the overrides object passed to `conversation.startSession({ overrides })`.
 *
 * Returns an `@elevenlabs/react`–compatible shape.
 */
export function buildAlexAgentOverrides(input: BuildOverridesInput) {
  const language: AlexLanguage = input.language ?? "fr";

  // SLIM core prompt for ElevenLabs (full Hive Mind stays app-side via alex-chat).
  const prompt = input.contextHint
    ? `${ALEX_CORE_PROMPT}\n\n# CONTEXTE\n${input.contextHint.trim()}`
    : ALEX_CORE_PROMPT;

  const firstMessage = buildAlexFirstMessage({
    firstName: input.firstName,
    isReturning: input.isReturning,
    language,
  });

  const voiceId = input.voiceId ?? ALEX_VOICE_DEFAULTS.voiceId;
  const stability = input.stability ?? ALEX_VOICE_DEFAULTS.stability;
  const similarity_boost = input.similarity ?? ALEX_VOICE_DEFAULTS.similarity;
  const style = input.style ?? ALEX_VOICE_DEFAULTS.style;
  const use_speaker_boost = input.speakerBoost ?? ALEX_VOICE_DEFAULTS.speakerBoost;

  return {
    agent: {
      prompt: { prompt },
      firstMessage,
      language,
    },
    tts: {
      voiceId,
      // ElevenLabs Convai accepts these inside `tts` overrides as well.
      stability,
      similarity_boost,
      style,
      use_speaker_boost,
    },
  };
}
