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
import {
  getVoiceConfigFor,
  ALEX_VOICE_BASE,
  ALEX_TTS_PROVIDER,
  type AlexVoiceMode,
} from "@/config/alexVoiceConfig";
import { prepareAlexSpeechText } from "@/lib/prepareAlexSpeechText";
import { useAlexVoiceLockedStore } from "@/stores/alexVoiceLockedStore";

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
  const rawFirstMessage = input.firstName
    ? buildAlexFirstMessage({
        firstName: input.firstName,
        isReturning: input.isReturning,
        language,
      })
    : tuning.firstMessage;
  // Normalize brand pronunciation (UNPRO → "Un Pro" / "Hun Pro") before TTS.
  const firstMessage = prepareAlexSpeechText(rawFirstMessage, language);

  // Voice tuning is LOCKED in alexVoiceConfig — ignore caller overrides
  // for stability/similarity/style/speakerBoost so it never drifts mid-session.
  // Session voice id is locked on first call and reused for every subsequent
  // turn (prevents voice flips between sentences).
  const store = useAlexVoiceLockedStore.getState();
  const candidateVoiceId = input.voiceId ?? ALEX_VOICE_BASE.voiceId;
  store.lockVoiceForSession({
    voiceId: candidateVoiceId,
    provider: ALEX_TTS_PROVIDER,
    language,
    mode,
  });
  const voiceId = store.sessionVoiceId ?? candidateVoiceId;
  const assertion = store.assertVoice(voiceId);
  if (!assertion.ok && assertion.expected) {
    // Drift detected — force locked voice, do NOT honor the caller override.
    return buildPayload(
      assertion.expected,
      prompt,
      firstMessage,
      language,
      tuning,
    );
  }

  return buildPayload(voiceId, prompt, firstMessage, language, tuning);
}

function buildPayload(
  voiceId: string,
  prompt: string,
  firstMessage: string,
  language: AlexLanguage,
  tuning: ReturnType<typeof getVoiceConfigFor>,
) {
  return {
    agent: {
      prompt: { prompt },
      firstMessage,
      language,
    },
    tts: {
      voiceId,
      modelId: ALEX_VOICE_BASE.modelId,
      stability: tuning.stability,
      similarity_boost: tuning.similarity_boost,
      style: tuning.style,
      use_speaker_boost: tuning.use_speaker_boost,
      speed: tuning.speed,
    },
  };
}
