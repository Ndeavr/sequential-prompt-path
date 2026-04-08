/**
 * AlexVoiceToneService
 * Manages voice tone standardization: accent control, speech pacing,
 * linguistic preprocessing, and Quebec flavor levels.
 * 
 * RULE: French = neutral international + subtle QC warmth
 * RULE: English = clear North American, never caricatural
 * RULE: Never regional accent (moé, toé, vowel stretching)
 */

import { supabase } from "@/integrations/supabase/client";

// ─── Accent Neutralization Rules ───

const REGIONAL_PATTERNS_FR: [RegExp, string][] = [
  // Block regional phonetic patterns in TTS text
  [/\bmoé\b/gi, "moi"],
  [/\btoé\b/gi, "toi"],
  [/\bfaque\b/gi, "donc"],
  [/\btsé\b/gi, "tu sais"],
  [/\bpis\b/gi, "et puis"],
  [/\bbien?\s+là\b/gi, "bien"],
  [/\blasticke\b/gi, "élastique"],
  [/\bchar\b/gi, "voiture"],
  [/\bchum\b/gi, "ami"],
  [/\bblonde\b/gi, "copine"],
  [/\bicitte\b/gi, "ici"],
  [/\benwèye\b/gi, "allez"],
  [/\bpantoute\b/gi, "pas du tout"],
  [/\bgossant\b/gi, "agaçant"],
  [/\bniaiser\b/gi, "plaisanter"],
];

// Pronunciation clarity rules — ensure clean diction
const DICTION_RULES_FR: [RegExp, string][] = [
  // Ensure clear syllable separation for key words
  [/\brénovation\b/gi, "ré-novation"],
  [/\bcopropriété\b/gi, "copro-priété"],
  // Remove filler words that hurt premium perception
  [/\beuh+\b/gi, ""],
  [/\bgenre\s+(?=que|de|à)/gi, ""],
  [/\bcomme\s+(?=genre)/gi, ""],
  // Smooth out stutters
  [/(\w)\1{3,}/g, "$1$1"],
];

// Pacing rules — prevent robotic delivery
const PACING_RULES: [RegExp, string][] = [
  // Convert excessive punctuation to natural pauses
  [/\.{3,}/g, "…"],
  [/!{2,}/g, "!"],
  [/\?{2,}/g, "?"],
  // Ensure natural sentence breaks
  [/([.!?])\s*([A-ZÀ-Ü])/g, "$1 $2"],
];

export interface VoiceToneConfig {
  speechRate: number;
  pitch: number;
  quebecFlavorLevel: number;
  neutralAccentEnabled: boolean;
  warmth: number;
  energy: number;
  formality: number;
  pacingStyle: string;
}

const DEFAULT_TONE_FR: VoiceToneConfig = {
  speechRate: 0.95,
  pitch: 1.0,
  quebecFlavorLevel: 1,
  neutralAccentEnabled: true,
  warmth: 0.7,
  energy: 0.5,
  formality: 0.5,
  pacingStyle: "natural_conversational",
};

const DEFAULT_TONE_EN: VoiceToneConfig = {
  speechRate: 1.0,
  pitch: 1.0,
  quebecFlavorLevel: 0,
  neutralAccentEnabled: true,
  warmth: 0.5,
  energy: 0.5,
  formality: 0.6,
  pacingStyle: "natural_conversational",
};

// ─── Core Functions ───

/**
 * Preprocess text for premium neutral voice delivery.
 * Removes regional markers, fixes diction, normalizes pacing.
 */
export function preprocessTextForTone(text: string, language: string, config?: Partial<VoiceToneConfig>): string {
  const tone = language === "en"
    ? { ...DEFAULT_TONE_EN, ...config }
    : { ...DEFAULT_TONE_FR, ...config };

  let processed = text;

  // 1. Remove regional accent patterns (FR only)
  if (language === "fr" && tone.neutralAccentEnabled) {
    for (const [pattern, replacement] of REGIONAL_PATTERNS_FR) {
      processed = processed.replace(pattern, replacement);
    }
  }

  // 2. Apply diction clarity rules (FR only)
  if (language === "fr") {
    for (const [pattern, replacement] of DICTION_RULES_FR) {
      processed = processed.replace(pattern, replacement);
    }
  }

  // 3. Apply pacing rules
  for (const [pattern, replacement] of PACING_RULES) {
    processed = processed.replace(pattern, replacement);
  }

  // 4. Simplify long sentences (break at 80+ chars without natural pause)
  if (tone.pacingStyle === "natural_conversational") {
    processed = breakLongSentences(processed);
  }

  // 5. Clean up whitespace
  processed = processed.replace(/\s{2,}/g, " ").trim();

  return processed;
}

/**
 * Break long sentences into shorter, more natural phrases.
 */
function breakLongSentences(text: string): string {
  return text.replace(/([^.!?]{80,?})(,\s)/g, "$1.$2");
}

/**
 * Build system prompt instructions for voice tone.
 * Injected into the AI model to control output style.
 */
export function buildToneSystemPrompt(language: string, config?: Partial<VoiceToneConfig>): string {
  const tone = language === "en"
    ? { ...DEFAULT_TONE_EN, ...config }
    : { ...DEFAULT_TONE_FR, ...config };

  const rules: string[] = [];

  if (language === "fr") {
    rules.push(
      "Parle en français international neutre avec une légère chaleur québécoise.",
      "N'utilise JAMAIS d'accent régional : pas de 'moé', 'toé', 'faque', 'tsé'.",
      "Articule clairement chaque mot. Diction professionnelle.",
      "Phrases courtes et directes. Maximum 15 mots par phrase.",
      "Ton calme, humain, jamais théâtral ni robotique.",
      "Pas de remplissage : pas de 'euh', 'genre', 'comme'.",
    );

    if (tone.quebecFlavorLevel === 0) {
      rules.push("Français parfaitement neutre international. Aucune couleur locale.");
    } else if (tone.quebecFlavorLevel === 1) {
      rules.push("Légère intonation québécoise naturelle — chaleureux mais professionnel.");
    } else {
      rules.push("Québécois léger accepté mais jamais caricatural.");
    }
  } else {
    rules.push(
      "Speak in clear, neutral North American English.",
      "Professional and warm. Never robotic or theatrical.",
      "Short sentences. Maximum 15 words per sentence.",
      "A light francophone accent is acceptable but always clear.",
      "Never caricatural or overly formal.",
    );
  }

  // Warmth / energy / formality
  if (tone.warmth > 0.7) rules.push(language === "fr" ? "Ton chaleureux et rassurant." : "Warm and reassuring tone.");
  if (tone.energy > 0.7) rules.push(language === "fr" ? "Ton dynamique et engageant." : "Dynamic and engaging tone.");
  if (tone.formality > 0.7) rules.push(language === "fr" ? "Ton structuré et professionnel." : "Structured and professional tone.");

  return rules.join("\n");
}

/**
 * Load tone configuration from database.
 */
export async function loadToneConfig(profileId: string): Promise<VoiceToneConfig | null> {
  try {
    const { data } = await supabase
      .from("alex_voice_tone_settings")
      .select("*")
      .eq("voice_profile_id", profileId)
      .eq("is_active", true)
      .limit(1)
      .single();

    if (!data) return null;

    return {
      speechRate: Number(data.speech_rate),
      pitch: Number(data.pitch),
      quebecFlavorLevel: data.quebec_flavor_level,
      neutralAccentEnabled: data.neutral_accent_enabled,
      warmth: Number(data.warmth),
      energy: Number(data.energy),
      formality: Number(data.formality),
      pacingStyle: data.pacing_style,
    };
  } catch {
    return null;
  }
}

/**
 * Log a voice render event.
 */
export async function logVoiceRender(params: {
  profileKey: string;
  languageCode: string;
  textInput: string;
  textPreprocessed: string;
  durationMs?: number;
  success: boolean;
  errorMessage?: string;
}) {
  try {
    await supabase.from("alex_voice_render_logs").insert({
      profile_key: params.profileKey,
      language_code: params.languageCode,
      text_input: params.textInput,
      text_preprocessed: params.textPreprocessed,
      duration_ms: params.durationMs ?? null,
      success: params.success,
      error_message: params.errorMessage ?? null,
    });
  } catch {
    // Silent fail — logging should never break voice
  }
}

/**
 * Get the default tone config for a language.
 */
export function getDefaultToneConfig(language: string): VoiceToneConfig {
  return language === "en" ? { ...DEFAULT_TONE_EN } : { ...DEFAULT_TONE_FR };
}
