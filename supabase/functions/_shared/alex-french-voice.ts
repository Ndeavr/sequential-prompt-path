/**
 * Alex French Voice Pipeline
 * 
 * Transforms raw AI text into natural spoken French Quebec audio.
 * 
 * Chain:
 *   AI response → extractTags → spokenFrenchRewrite → ttsNormalize → ElevenLabs
 * 
 * Design: each layer is a pure function, composable and testable.
 */

// ─── 1. Deterministic Greeting Builder ───

export interface GreetingContext {
  /** Display name for UI transcript */
  firstName?: string | null;
  /** Preferred spoken name for TTS (overrides firstName in audio) */
  preferredSpokenName?: string | null;
  /** Legacy alias — mapped to firstName internally */
  userName?: string | null;
  isReturningUser?: boolean;
  /** Also accept legacy key */
  isReturning?: boolean;
  /** Local hour 0-23 (client-provided). Falls back to UTC-5 estimate. */
  localHour?: number | null;
  /** Legacy: UTC offset in hours */
  utcOffset?: number;
  /** Legacy: override hour for testing */
  overrideHour?: number;
}

export interface GreetingResult {
  /** Greeting for visible UI transcript */
  displayGreeting: string;
  /** Greeting optimized for TTS (may use preferredSpokenName) */
  spokenGreeting: string;
}

export function buildAlexGreeting(ctx: GreetingContext): GreetingResult {
  const returning = ctx.isReturningUser ?? ctx.isReturning ?? false;
  const displayName = ctx.firstName ?? ctx.userName ?? null;
  const spokenName = ctx.preferredSpokenName ?? displayName;

  // Resolve hour: prefer explicit localHour, then legacy overrideHour, then UTC offset estimate
  const hour =
    ctx.localHour != null
      ? ctx.localHour
      : ctx.overrideHour != null
        ? ctx.overrideHour
        : (new Date().getUTCHours() + (ctx.utcOffset ?? -5) + 24) % 24;

  function greet(name: string | null): string {
    const suffix = name ? ` ${name}` : "";
    if (returning) return `Rebonjour${suffix}.`;
    if (hour >= 5 && hour < 12) return `Bonjour${suffix}.`;
    if (hour >= 12 && hour < 18) return `Bon après-midi${suffix}.`;
    return `Bonsoir${suffix}.`;
  }

  // Follow-up varies to avoid robotic repetition
  const followUps = [
    "Comment puis-je vous aider?",
    "Qu'est-ce que je peux faire pour vous?",
    "Je vous écoute.",
  ];
  const followUp = followUps[Math.floor(Math.random() * followUps.length)];

  return {
    displayGreeting: `${greet(displayName)} ${followUp}`,
    spokenGreeting: `${greet(spokenName)} ${followUp}`,
  };
}

/** @deprecated Use buildAlexGreeting instead */
export function buildGreeting(ctx: GreetingContext): string {
  return buildAlexGreeting(ctx).displayGreeting;
}

// ─── 2. Spoken French Rewrite ───
// Converts written French into natural spoken phrasing.

const SPOKEN_REPLACEMENTS: [RegExp, string][] = [
  // Remove markdown artifacts the model might slip in
  [/\*\*([^*]+)\*\*/g, "$1"],
  [/\*([^*]+)\*/g, "$1"],
  [/#{1,3}\s*/g, ""],
  [/- /g, ""],
  [/•\s*/g, ""],

  // Written → spoken contractions
  [/\bIl y a\b/g, "Y'a"],
  [/\bil y a\b/g, "y'a"],
  [/\bJe ne\b/g, "Je"],
  [/\bje ne\b/g, "je"],
  [/\bn'est-ce pas\b/gi, "non?"],
  [/\bCe n'est pas\b/g, "C'est pas"],
  [/\bce n'est pas\b/g, "c'est pas"],
  [/\bIl ne faut pas\b/g, "Faut pas"],
  [/\bil ne faut pas\b/g, "faut pas"],

  // Overly formal → natural
  [/\bje vous en prie\b/gi, "bien sûr"],
  [/\bn'hésitez pas à\b/gi, ""],
  [/\bveuillez\b/gi, ""],
  [/\bje vous recommande de\b/gi, "je vous suggère de"],

  // Remove filler the model loves
  [/\bEn effet,?\s*/gi, ""],
  [/\bTout à fait,?\s*/gi, ""],
  [/\bAbsolument,?\s*/gi, ""],
  [/\bBien entendu,?\s*/gi, ""],

  // Clean trailing/leading spaces
  [/\s{2,}/g, " "],
];

export function spokenFrenchRewrite(text: string): string {
  let result = text;
  for (const [pattern, replacement] of SPOKEN_REPLACEMENTS) {
    result = result.replace(pattern, replacement);
  }
  return result.trim();
}

// ─── 3. TTS Text Normalizer ───
// Prepares text specifically for ElevenLabs pronunciation.

const TTS_NORMALIZATIONS: [RegExp, string][] = [
  // Numbers → words for clean pronunciation
  [/\b(\d+)\s*\$/g, (_m, n) => `${n} dollars`],
  [/\$\s*(\d+)/g, (_m, n) => `${n} dollars`],
  [/(\d+)\s*%/g, "$1 pour cent"],

  // Common abbreviations
  [/\bm²/g, "mètres carrés"],
  [/\bpi²/g, "pieds carrés"],
  [/\bRBQ\b/g, "R B Q"],
  [/\bCCQ\b/g, "C C Q"],
  [/\bUNPRO\b/g, "UNPRO"],
  [/\bAIPP\b/g, "A I P P"],

  // URLs and emails — skip or simplify
  [/https?:\/\/\S+/g, "le lien"],
  [/\S+@\S+\.\S+/g, "l'adresse courriel"],

  // Punctuation for natural pauses
  [/\.\.\./g, "..."], // Keep ellipsis for ElevenLabs pause
  [/\s*—\s*/g, "... "], // Em-dash → pause
  [/\s*–\s*/g, "... "], // En-dash → pause

  // Remove parenthetical asides (too complex for voice)
  [/\([^)]{0,60}\)/g, ""],

  // Clean up
  [/\s{2,}/g, " "],
];

export function ttsNormalize(text: string): string {
  let result = text;
  for (const [pattern, replacement] of TTS_NORMALIZATIONS) {
    result = result.replace(pattern, replacement as string);
  }
  return result.trim();
}

// ─── 4. Sentence Splitter (for chunked TTS) ───
// Splits text into natural breath-group sentences.

export function splitIntoSentences(text: string): string[] {
  // Split on sentence-ending punctuation, keeping the punctuation
  const raw = text.match(/[^.!?]+[.!?]+/g) || [text];
  return raw
    .map(s => s.trim())
    .filter(s => s.length >= 3);
}

// ─── 5. Full Pipeline ───

export interface VoicePipelineResult {
  /** Clean text for UI display (no tags, no TTS normalization) */
  displayText: string;
  /** Sentences ready for TTS */
  ttsSentences: string[];
  /** Extracted UI action tags */
  uiActions: Array<Record<string, string>>;
  /** Next best action */
  nextAction: string | null;
}

export function processAlexResponse(rawAiText: string): VoicePipelineResult {
  // 1. Extract structured tags
  const { cleanText: afterNext, nextAction } = extractNextAction(rawAiText);
  const { cleanText: displayText, actions: uiActions } = extractUIActions(afterNext);

  // 2. Spoken rewrite (for TTS, not display)
  const spoken = spokenFrenchRewrite(displayText);

  // 3. TTS normalization
  const normalized = ttsNormalize(spoken);

  // 4. Split into sentences
  const ttsSentences = splitIntoSentences(normalized);

  return { displayText, ttsSentences, uiActions, nextAction };
}

// ─── Tag Extraction (shared) ───

function extractUIActions(text: string): { cleanText: string; actions: Array<Record<string, string>> } {
  const actions: Array<Record<string, string>> = [];
  const regex = /<ui_action\s+([^/>]+)\s*\/>/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const attrs: Record<string, string> = {};
    const attrRegex = /(\w+)="([^"]+)"/g;
    let attrMatch;
    while ((attrMatch = attrRegex.exec(match[1])) !== null) {
      attrs[attrMatch[1]] = attrMatch[2];
    }
    if (attrs.type) actions.push(attrs);
  }
  return { cleanText: text.replace(/<ui_action[^/>]*\/>/g, "").trim(), actions };
}

function extractNextAction(text: string): { cleanText: string; nextAction: string | null } {
  const regex = /<next_action>([\s\S]*?)<\/next_action>/;
  const match = regex.exec(text);
  const nextAction = match ? match[1].trim() : null;
  return { cleanText: text.replace(/<next_action>[\s\S]*?<\/next_action>/g, "").trim(), nextAction };
}

// ─── 6. ElevenLabs Voice Config ───
// Optimized for natural French Quebec female voice.

export const ALEX_VOICE_CONFIG = {
  voiceId: "FGY2WhTYpPnrIDTdsKH5", // Laura — warm, natural
  modelId: "eleven_turbo_v2_5",
  outputFormat: "mp3_22050_32",
  voiceSettings: {
    stability: 0.62,        // Slightly higher for calm consistency
    similarity_boost: 0.80,  // Strong voice identity
    style: 0.08,             // Very low — avoid theatrical delivery
    use_speaker_boost: true,
    speed: 0.95,             // Slightly slower than default for clarity + warmth
  },
} as const;

// ─── 7. System Prompt (voice-optimized) ───

export const ALEX_VOICE_SYSTEM_PROMPT = `Tu es Alex, concierge vocale premium chez UNPRO.

QUI TU ES :
- Femme intelligente, expérience terrain en construction, rénovation, copropriété, immobilier au Québec.
- Tu dis "je suis Alex" ou "votre concierge". Jamais IA, robot, assistant virtuel.
- Féminin toujours : "ravie", "certaine", "prête".

COMMENT TU PARLES :
- Français naturel, compatible Québec. Pas de France-français soutenu.
- Phrases courtes. Maximum 2-3 phrases par réponse.
- UNE question à la fois. Jamais deux.
- Comme au téléphone : direct, clair, chaleureux.
- Pas de listes. Pas de puces. Pas de tirets. Pas de gras. Pas de markdown.
- Pas de "n'hésitez pas", "absolument", "en effet", "tout à fait".
- Utilise des contractions naturelles : "c'est", "y'a", "j'peux".

COMPORTEMENT :
- Par défaut, ton interlocuteur est un propriétaire.
- Entrepreneur évident → guide vers forfaits, croissance, positionnement.
- Toujours proposer une action concrète : photo, score, plan, réservation, vérification.
- Stress détecté → rassure en une phrase. Urgence → accélère. Hésitation → simplifie.
- Budget sensible → respecte sans juger.

COPROPRIÉTÉ :
- Tu connais les syndicats, le quorum, la Loi 16, les fonds de prévoyance.
- Tu guides les administrateurs et copropriétaires sans jargon inutile.

ACTIONS UI (insère dans ta réponse si pertinent) :
<ui_action type="navigate" target="/dashboard/properties" />
<ui_action type="open_upload" />
<ui_action type="show_score" />
<ui_action type="show_pricing" />
<ui_action type="open_booking" />
<ui_action type="show_plan_recommendation" target="elite" />
<ui_action type="scroll_to" target="recommendations" />
<ui_action type="highlight" target="[data-plan='elite']" />
<ui_action type="show_chips" items="option1,option2,option3" />

PROCHAINE ACTION :
<next_action>description courte</next_action>

RÈGLES ABSOLUES :
- 1 à 3 phrases max. C'est de la voix.
- Termine par une question OU une suggestion d'action.
- N'invente jamais de données.
- Ne répète jamais le greeting.`;
