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
    if (hour >= 5 && hour < 18) return `Bonjour${suffix}.`;
    return `Bonsoir${suffix}.`;
  }

  // Follow-up varies to avoid robotic repetition
  const followUps = [
    "Comment je peux vous aider?",
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

// ─── 1b. Voice Response Composer ───
// Assembles a natural spoken reply from discrete parts.
// Enforces: max 4 short sentences, max 1 question, conversational flow.

export interface ComposeVoiceReplyInput {
  /** Greeting sentence (from buildAlexGreeting). Omit on non-first turns. */
  greeting?: string | null;
  /** Short acknowledgment / bridge sentence (e.g. "Je suis là.", "On reprend.") */
  acknowledgment?: string | null;
  /** Core useful info — one short sentence */
  shortAnswer?: string | null;
  /** Follow-up question — at most one */
  nextQuestion?: string | null;
}

export interface ComposeVoiceReplyResult {
  /** Full text for UI transcript */
  displayText: string;
  /** Full text for TTS (same content, may differ if spoken name used) */
  spokenText: string;
  /** Individual sentences for chunked TTS */
  sentences: string[];
}

export function composeAlexVoiceReply(
  input: ComposeVoiceReplyInput,
  /** Optional: spoken-name variant of greeting for TTS */
  spokenGreeting?: string | null,
): ComposeVoiceReplyResult {
  const displayParts: string[] = [];
  const spokenParts: string[] = [];

  // 1. Greeting (first sentence, first turn only)
  if (input.greeting) {
    displayParts.push(cleanSentence(input.greeting));
    spokenParts.push(cleanSentence(spokenGreeting ?? input.greeting));
  }

  // 2. Acknowledgment / bridge
  if (input.acknowledgment) {
    const ack = cleanSentence(input.acknowledgment);
    displayParts.push(ack);
    spokenParts.push(ack);
  }

  // 3. Short answer
  if (input.shortAnswer) {
    const ans = cleanSentence(input.shortAnswer);
    displayParts.push(ans);
    spokenParts.push(ans);
  }

  // 4. Question (max 1, always last)
  if (input.nextQuestion) {
    const q = ensureQuestionMark(cleanSentence(input.nextQuestion));
    displayParts.push(q);
    spokenParts.push(q);
  }

  // Guard: cap at 4 sentences
  const cappedDisplay = displayParts.slice(0, 4);
  const cappedSpoken = spokenParts.slice(0, 4);

  return {
    displayText: cappedDisplay.join(" "),
    spokenText: cappedSpoken.join(" "),
    sentences: cappedSpoken,
  };
}

/** Trim and ensure sentence ends with punctuation */
function cleanSentence(s: string): string {
  const trimmed = s.trim();
  if (!trimmed) return "";
  if (/[.!?…]$/.test(trimmed)) return trimmed;
  return trimmed + ".";
}

/** Ensure a question ends with ? */
function ensureQuestionMark(s: string): string {
  const trimmed = s.trim();
  if (trimmed.endsWith("?")) return trimmed;
  // Replace trailing period with question mark
  if (trimmed.endsWith(".")) return trimmed.slice(0, -1) + "?";
  return trimmed + "?";
}

// ─── 2. Spoken French Rewrite ───
// Converts stiff/formal/corporate French into natural spoken phrasing.
// Two modes: "soft" (light cleanup) and "full" (aggressive conversational rewrite).

const SPOKEN_REPLACEMENTS_CORE: [RegExp, string][] = [
  // ── Markdown artifacts ──
  [/\*\*([^*]+)\*\*/g, "$1"],
  [/\*([^*]+)\*/g, "$1"],
  [/#{1,3}\s*/g, ""],
  [/- /g, ""],
  [/•\s*/g, ""],

  // ── Written → spoken contractions ──
  [/\bIl y a\b/g, "Y'a"],
  [/\bil y a\b/g, "y'a"],
  [/\bJe ne\b/g, "Je"],
  [/\bje ne\b/g, "je"],
  [/\bn'est-ce pas\b/gi, "non?"],
  [/\bCe n'est pas\b/g, "C'est pas"],
  [/\bce n'est pas\b/g, "c'est pas"],
  [/\bIl ne faut pas\b/g, "Faut pas"],
  [/\bil ne faut pas\b/g, "faut pas"],

  // ── Overly formal → natural ──
  [/\bje vous en prie\b/gi, "bien sûr"],
  [/\bn'hésitez pas à\b/gi, ""],
  [/\bveuillez\b/gi, ""],
  [/\bje vous recommande de\b/gi, "je vous suggère de"],

  // ── Model filler removal ──
  [/\bEn effet,?\s*/gi, ""],
  [/\bTout à fait,?\s*/gi, ""],
  [/\bAbsolument,?\s*/gi, ""],
  [/\bBien entendu,?\s*/gi, ""],
  [/\bEffectivement,?\s*/gi, ""],
  [/\bÉvidemment,?\s*/gi, ""],
  [/\bBien sûr,?\s*/gi, ""],
  [/\bParfait,?\s*/gi, ""],
];

// ── Banned corporate / assistant phrasing → natural replacements ──
const SPOKEN_REPLACEMENTS_FULL: [RegExp, string][] = [
  // "Afin de" → "Pour"
  [/\bAfin de\b/g, "Pour"],
  [/\bafin de\b/g, "pour"],
  // "Permettez-moi de" → ""
  [/\bPermettez-moi de\b/gi, ""],
  // "Je suis en mesure de" → "Je peux"
  [/\bJe suis en mesure de\b/g, "Je peux"],
  [/\bje suis en mesure de\b/g, "je peux"],
  // "Il serait pertinent de" → "Le mieux, c'est de"
  [/\bIl serait pertinent de\b/g, "Le mieux, c'est de"],
  [/\bil serait pertinent de\b/g, "le mieux, c'est de"],
  // "Nous allons procéder" → "On va faire ça"
  [/\bNous allons procéder\b/g, "On va faire ça"],
  [/\bnous allons procéder\b/g, "on va faire ça"],
  // "Dans votre situation actuelle" → ""
  [/\bDans votre situation actuelle,?\s*/gi, ""],
  // "Merci pour cette précision" → "D'accord"
  [/\bMerci pour cette précision\.?\s*/gi, "D'accord. "],
  // "Je vous propose les options suivantes" → "On peut"
  [/\bJe vous propose les options suivantes\s*:?\s*/gi, "On peut "],
  // Additional corporate fluff
  [/\bJe me permets de\b/gi, ""],
  [/\bIl convient de noter que\b/gi, ""],
  [/\bIl est important de souligner que\b/gi, ""],
  [/\bDans le cadre de\b/g, "Pour"],
  [/\bdans le cadre de\b/g, "pour"],
  [/\bEn ce qui concerne\b/g, "Pour"],
  [/\ben ce qui concerne\b/g, "pour"],
  [/\bNous allons voir ensemble\b/gi, "On va voir"],
  [/\bJe tiens à vous informer que\b/gi, ""],
  [/\bComme mentionné précédemment,?\s*/gi, ""],
  [/\bSuite à votre demande,?\s*/gi, ""],
  // "nous" → "on" (spoken Québec)
  [/\bNous pouvons\b/g, "On peut"],
  [/\bnous pouvons\b/g, "on peut"],
  [/\bNous allons\b/g, "On va"],
  [/\bnous allons\b/g, "on va"],
];

// Final cleanup (always applied last)
const SPOKEN_CLEANUP: [RegExp, string][] = [
  [/\s{2,}/g, " "],
  [/\.\s*\./g, "."],
  [/^\s+/g, ""],
];

export type SpokenRewriteMode = "soft" | "full";

/**
 * Rewrites text from formal/written French to natural spoken French.
 *
 * @param text  Raw AI output text
 * @param mode  "soft" = light cleanup (markdown, filler, basic contractions)
 *              "full" = aggressive rewrite (corporate phrases, nous→on, etc.)
 *
 * Examples (mode "full"):
 *   "Afin de vous aider, permettez-moi de vérifier."
 *     → "Pour vous aider, vérifier."
 *   "Je suis en mesure de vous accompagner dans le cadre de votre projet."
 *     → "Je peux vous accompagner pour votre projet."
 *   "Merci pour cette précision. Il serait pertinent de regarder le budget."
 *     → "D'accord. Le mieux, c'est de regarder le budget."
 */
export function rewriteAlexToSpokenFrench(text: string, mode: SpokenRewriteMode = "full"): string {
  let result = text;

  for (const [p, r] of SPOKEN_REPLACEMENTS_CORE) {
    result = result.replace(p, r);
  }

  if (mode === "full") {
    for (const [p, r] of SPOKEN_REPLACEMENTS_FULL) {
      result = result.replace(p, r);
    }
  }

  for (const [p, r] of SPOKEN_CLEANUP) {
    result = result.replace(p, r);
  }

  return result.trim();
}

/** @deprecated Use rewriteAlexToSpokenFrench instead */
export function spokenFrenchRewrite(text: string): string {
  return rewriteAlexToSpokenFrench(text, "full");
}

// ─── 3. French TTS Normalization Layer ───
// Prepares text for natural French Quebec ElevenLabs pronunciation.
// Applied AFTER spoken rewrite, BEFORE sending to TTS.

// ── 3a. Quebec Place Names & Proper Nouns ──

const FRENCH_NAME_NORMALIZATIONS: [RegExp, string][] = [
  // Cities & boroughs — accent-corrected for TTS
  [/\bMontreal\b/g, "Montréal"],
  [/\bQuebec\b/g, "Québec"],
  [/\bLevis\b/g, "Lévis"],
  [/\bLaval\b/g, "Laval"],
  [/\bLongueuil\b/g, "Longueuil"],
  [/\bTrois-Rivieres\b/g, "Trois-Rivières"],
  [/\bSherbrooke\b/g, "Sherbrooke"],
  [/\bGatineau\b/g, "Gatineau"],
  [/\bSaguenay\b/g, "Saguenay"],
  [/\bIle des Soeurs\b/gi, "Île-des-Sœurs"],
  [/\bIle-des-Soeurs\b/gi, "Île-des-Sœurs"],
  [/\bSt-/g, "Saint-"],
  [/\bSte-/g, "Sainte-"],
  [/\bMont-Royal\b/g, "Mont-Royal"],
  [/\bOutremont\b/g, "Outremont"],
  [/\bRosemont\b/g, "Rosemont"],
  [/\bVerdun\b/g, "Verdun"],
  [/\bLaSalle\b/g, "LaSalle"],
  [/\bAnjou\b/g, "Anjou"],
  // Common misspellings in transcripts
  [/\bChateauguay\b/g, "Châteauguay"],
  [/\bBecancour\b/g, "Bécancour"],
  [/\bNicolet\b/g, "Nicolet"],
];

export function normalizeFrenchNamesForSpeech(text: string): string {
  let result = text;
  for (const [p, r] of FRENCH_NAME_NORMALIZATIONS) {
    result = result.replace(p, r);
  }
  return result;
}

// ── 3b. Abbreviations, Numbers, Symbols ──

const TTS_NORMALIZATIONS: [RegExp, string][] = [
  // ── Time & schedule ──
  [/\b24\/7\b/g, "24 sur 7"],
  [/\b7\/7\b/g, "7 sur 7"],
  [/\b(\d{1,2})h(\d{2})?\b/g, (_m: string, h: string, min: string) =>
    min && min !== "00" ? `${h} heures ${min}` : `${h} heures`
  ],

  // ── Currency ──
  [/\b(\d[\d\s]*)\s*\$/g, (_m: string, n: string) => `${n.trim()} dollars`],
  [/\$\s*(\d[\d\s]*)/g, (_m: string, n: string) => `${n.trim()} dollars`],
  [/\b(\d[\d\s]*)\s*¢/g, (_m: string, n: string) => `${n.trim()} cents`],

  // ── Percentages ──
  [/(\d+)\s*%/g, "$1 pour cent"],

  // ── Measurements ──
  [/\bm²/g, "mètres carrés"],
  [/\bm2\b/g, "mètres carrés"],
  [/(\d)pi²/g, "$1 pieds carrés"],
  [/\bpi²/g, "pieds carrés"],
  [/\bpi2\b/g, "pieds carrés"],
  [/\bpi\.\s*ca\./g, "pieds carrés"],
  [/\bkm\b/g, "kilomètres"],
  [/\bkg\b/g, "kilogrammes"],
  [/\bcm\b/g, "centimètres"],
  [/\bmm\b/g, "millimètres"],

  // ── Quebec construction / industry acronyms ──
  [/\bRBQ\b/g, "R B Q"],
  [/\bCCQ\b/g, "C C Q"],
  [/\bCSSST\b/g, "C S S S T"],
  [/\bCNESSST\b/g, "C N E S S T"],
  [/\bSHQ\b/g, "S H Q"],
  [/\bSCHL\b/g, "S C H L"],
  [/\bACQ\b/g, "A C Q"],
  [/\bAPCHQ\b/g, "A P C H Q"],
  [/\bOIQ\b/g, "O I Q"],
  [/\bOAQ\b/g, "O A Q"],

  // ── UNPRO-specific ──
  [/\bUNPRO\b/g, "UNPRO"],
  [/\bAIPP\b/g, "A I double P"],

  // ── Common abbreviations ──
  [/\bétc\.\b/gi, "et cétéra"],
  [/\betc\.\b/gi, "et cétéra"],
  [/\bex\.\s*/gi, "par exemple "],
  [/\bex\s*:\s*/gi, "par exemple "],
  [/\bvs\.?\b/gi, "versus"],
  [/\bno\.\s*/gi, "numéro "],
  [/\bNo\.\s*/gi, "numéro "],
  [/\bN°\s*/g, "numéro "],
  [/\bn°\s*/g, "numéro "],
  [/\btel\.\s*/gi, "téléphone "],
  [/\bapp\.\s*/gi, "appartement "],

  // ── Ordinals ──
  [/\b1er\b/g, "premier"],
  [/\b1re\b/g, "première"],
  [/\b1ère\b/g, "première"],
  [/\b2e\b/g, "deuxième"],
  [/\b3e\b/g, "troisième"],

  // ── URLs and emails ──
  [/https?:\/\/\S+/g, "le lien"],
  [/\S+@\S+\.\S+/g, "l'adresse courriel"],

  // ── Punctuation for natural pauses ──
  [/\.\.\./g, "..."],        // Keep ellipsis for ElevenLabs pause
  [/\s*—\s*/g, "... "],      // Em-dash → pause
  [/\s*–\s*/g, "... "],      // En-dash → pause
  [/\s*;\s*/g, "... "],      // Semicolon → pause
  [/\s*:\s*/g, "... "],      // Colon → pause (unless time, handled above)

  // ── Remove parenthetical asides ──
  [/\([^)]{0,80}\)/g, ""],

  // ── Repeated punctuation cleanup ──
  [/([!?.])\1+/g, "$1"],     // "!!!" → "!"
  [/\s*[,]\s*[,]+/g, ","],   // ",," → ","

  // ── Formatting symbols ──
  [/[*_~`#]/g, ""],          // Remove markdown symbols
  [/\|/g, ""],               // Remove pipe characters
  [/\[([^\]]*)\]/g, "$1"],   // [text] → text
  [/\{[^}]*\}/g, ""],        // Remove {braces}

  // ── Final cleanup ──
  [/\s{2,}/g, " "],
];

/**
 * Full French TTS normalization.
 * Expands abbreviations, fixes names, cleans punctuation.
 *
 * Examples:
 *   "RBQ valide, 24/7, Ile des Soeurs"
 *     → "R B Q valide... 24 sur 7... Île-des-Sœurs"
 *   "500$ pour 200pi² à Montreal"
 *     → "500 dollars pour 200 pieds carrés à Montréal"
 *   "AIPP score: 85%"
 *     → "A I double P score... 85 pour cent"
 */
export function normalizeTextForFrenchTts(text: string): string {
  // 1. Fix proper nouns first
  let result = normalizeFrenchNamesForSpeech(text);

  // 2. Apply all TTS normalizations
  for (const [pattern, replacement] of TTS_NORMALIZATIONS) {
    result = result.replace(pattern, replacement as string);
  }

  return result.trim();
}

/** @deprecated Use normalizeTextForFrenchTts instead */
export function ttsNormalize(text: string): string {
  return normalizeTextForFrenchTts(text);
}

// ─── 4. Speech Splitter ───
// Splits text into breath-friendly TTS segments.
// Targets ~60-80 chars per segment for natural rhythm.

/**
 * Split text into short spoken segments for chunked TTS.
 * Splits on sentence boundaries first, then breaks long sentences
 * at natural pause points (commas, conjunctions).
 *
 * @param text  Normalized text ready for TTS
 * @param maxLen  Max characters per segment (default 80)
 */
export function splitForSpeech(text: string, maxLen = 80): string[] {
  // First pass: split on sentence-ending punctuation
  const sentences = text.match(/[^.!?]+[.!?…]+/g) || [text];

  const segments: string[] = [];
  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (trimmed.length < 3) continue;

    if (trimmed.length <= maxLen) {
      segments.push(trimmed);
      continue;
    }

    // Break long sentences at natural pause points
    const subParts = trimmed.split(/(?<=,)\s+|(?<=\.\.\.)\s*/);
    let buffer = "";

    for (const part of subParts) {
      if (buffer && (buffer.length + part.length + 1) > maxLen) {
        segments.push(buffer.trim());
        buffer = part;
      } else {
        buffer = buffer ? `${buffer} ${part}` : part;
      }
    }
    if (buffer.trim()) segments.push(buffer.trim());
  }

  return segments.filter(s => s.length >= 3);
}

/** @deprecated Use splitForSpeech instead */
export function splitIntoSentences(text: string): string[] {
  return splitForSpeech(text);
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
  const { cleanText: tagFreeText, actions: uiActions } = extractUIActions(afterNext);

  // 2. Spoken French rewrite (aggressive mode — corporate → conversational)
  const spoken = rewriteAlexToSpokenFrench(tagFreeText, "full");

  // 3. Name pronunciation normalization (applied to both display AND TTS)
  const namedFixed = normalizeFrenchNamesForSpeech(spoken);

  // ── CRITICAL: displayText = spoken-rewritten text ──
  // This ensures the UI transcript matches what Alex actually says.
  // TTS normalization (abbreviation expansion, unit spelling) is pronunciation-only.
  const displayText = namedFixed;

  // 4. Full TTS normalization (abbreviations, currency, punctuation — TTS only)
  const normalized = normalizeTextForFrenchTts(namedFixed);

  // 5. Split into breath-friendly TTS segments
  const ttsSentences = splitForSpeech(normalized);

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
// Locked voice ID: XB0fDUnXU5powFXDhCwa (Charlotte — premium female FR+EN)
// Alex is a premium female AI concierge.

export type AlexVoiceProfile = "default" | "profile_a" | "profile_b";

const VOICE_PROFILES = {
  default: {
    stability: 0.43,
    similarity_boost: 0.78,
    style: 0.28,
    use_speaker_boost: true,
  },
  profile_a: {
    stability: 0.45,
    similarity_boost: 0.80,
    style: 0.30,
    use_speaker_boost: true,
  },
  profile_b: {
    stability: 0.48,
    similarity_boost: 0.82,
    style: 0.25,
    use_speaker_boost: true,
  },
} as const;

export function getAlexVoiceSettings(profile: AlexVoiceProfile = "default") {
  return { ...VOICE_PROFILES[profile] };
}

export const ALEX_VOICE_CONFIG = {
  voiceId: "XB0fDUnXU5powFXDhCwa",  // Alex premium female voice — Charlotte (FR + EN)
  modelId: "eleven_multilingual_v2",
  outputFormat: "mp3_44100_128",
  chunkLengthSchedule: [70, 110, 150],
  voiceSettings: VOICE_PROFILES.default,
  /** ElevenLabs speech speed — 0.95 = slightly slower for clarity */
  speed: 0.95,
} as const;

// ─── 7. System Prompt (voice-optimized) ───

export const ALEX_VOICE_SYSTEM_PROMPT = `Tu es Alex d'UNPRO. Concierge IA premium, voix féminine, spécialisée dans les services résidentiels au Québec.

═══ IDENTITÉ ═══
- Femme intelligente, calme, élégante, confiante, chaleureuse.
- Énergie : luxury concierge + consultante d'élite + amie de confiance.
- Âge vocal : 28-42 ans, voix claire, profondeur chaleureuse, énergie exécutive moderne.
- Tu dis "je suis Alex" ou "votre concierge UNPRO". Jamais IA, robot, assistant virtuel, chatbot.
- Féminin toujours : "ravie", "certaine", "prête", "convaincue".
- Jamais goofy, robotique, surexcitée, soumise, générique.
- Prononciation : UNPRO = "Un Pro" en français.

═══ LANGUE ═══
- Français québécois naturel par défaut. Chaque réponse en français.
- Bascule en anglais seulement si l'utilisateur parle anglais 2 messages consécutifs ou le demande.
- Contractions naturelles : "c'est", "y'a", "j'peux", "on va".
- Accent québécois premium neutre — pas de France, pas de rural, pas de robotique.

═══ STYLE DE PAROLE ═══
- Maximum 1-2 phrases par réponse. C'est de la voix. Court.
- UNE question à la fois. Jamais deux.
- Micro-pauses naturelles, rythme de phrase contrôlé, fins de phrase nettes.
- Pas de listes, puces, tirets, gras, markdown.
- Pas de "n'hésitez pas", "absolument", "en effet", "tout à fait", "afin de", "permettez-moi".

═══ LANGAGE DE CONFIANCE ═══
Remplacer les formules faibles :
- "peut-être" → "La meilleure option :"
- "je pense" → "Je recommande :"
- "il est possible" → "Cause la plus probable :"
- "on pourrait" → "Voici ce que je ferais :"

═══ MICRO-PHRASES PREMIUM ═══
"Je m'en occupe." / "Je vous guide." / "Bon choix." / "On simplifie ça." / "Je vous montre." / "Excellent point." / "Voici l'option forte."

═══ PHRASES INTERDITES ═══
- "How can I help you today" / "absolutely" / "sure thing" / "no worries"
- "as an AI" / "sorry for confusion" / "je suis une IA" / "je suis chatgpt"

═══ MISSION ═══
👉 Comprendre rapidement le besoin du client.
👉 Identifier le problème avant de parler de service.
👉 Recommander LE meilleur professionnel.
👉 Amener directement à la prise de rendez-vous.
Tu ne donnes pas d'options ouvertes. Tu guides vers une décision.

═══ INTELLIGENCE ÉMOTIONNELLE ═══
Détecter l'urgence. Si l'utilisateur mentionne : fuite, inondation, moisissure, arnaque, froid, toiture, urgence —
Changer de ton immédiatement :
"Compris. On règle ça maintenant."
Puis guider rapidement.

═══ FLOW PROPRIÉTAIRE ═══
Objectif : clarté + confiance + action.
1. Comprendre le problème
2. Affiner le scope
3. Demander photo/détails
4. Donner un insight
5. Recommander la prochaine action
6. Pousser vers sauvegarde/login/booking quand pertinent

Exemples :
"J'ai froid chez moi" → Alex : "Entretoit, fenêtres ou sous-sol?"
Photo uploadée → "Je vois possiblement un manque d'isolation. Voulez-vous une analyse rapide?"

═══ FLOW ENTREPRENEUR ═══
Objectif : convertir vers un plan payant.
1. Identifier métier + ville
2. Importer présence actuelle
3. Révéler revenus manqués
4. Montrer l'opportunité
5. Closer l'onboarding

"Je suis couvreur." → Alex : "Dans quelle ville?"
Puis : "Je vois plusieurs opportunités locales non captées. On regarde votre profil?"

═══ FLOW CONDO / SYNDICAT ═══
- Ton structuré, crédible, cadré.
- Connaissance : syndicats, quorum, Loi 16, fonds de prévoyance.

═══ LANGAGE DE FERMETURE ═══
Jamais de demandes passives. Utiliser :
"Je vous prépare ça." / "On continue ici." / "Je peux activer votre compte." / "Je peux comparer vos soumissions maintenant." / "Je peux réserver votre secteur."

═══ MOMENTS WOW (OBLIGATOIRE) ═══
Chaque session significative doit créer un moment mémorable :
"Vous pourriez économiser environ 4200$."
"Je vois 2 entrepreneurs mieux adaptés que la moyenne."
"Votre soumission semble 18% plus élevée que le marché."
"Cette photo montre un indice souvent ignoré."

═══ MODE REVENUS ═══
Propriétaire : "Créer un compte pour sauvegarder cette analyse."
Entrepreneur : "Je peux vous montrer les contrats perdus ce mois-ci."
Comparaison : "Téléversez vos 3 soumissions."

═══ RÈGLES MÉTIER CRITIQUES ═══
- UNPRO N'EST PAS une plateforme de 3 soumissions. JAMAIS proposer de "comparer 3 soumissions".
- Tu CHOISIS le meilleur professionnel. C'est TON rôle.
- Tu FAVORISES la prise de rendez-vous directe.
- Tu COMMENCES par le symptôme/problème. Jamais par une catégorie générique.
- Tu UTILISES l'adresse connue si disponible. Tu ne la redemandes pas.
- Tu ne BASCULES pas vers l'anglais sauf demande explicite.
- Tu ne REDEMANDES jamais des informations déjà connues.

═══ GARDE-FOUS CONVERSATION ═══
- Sujets autorisés : services résidentiels, rénovation, construction, entretien, entrepreneurs, copropriétés, booking, services UNPRO.
- Hors sujet : "Ma spécialité c'est les services résidentiels. Comment je peux vous aider avec votre propriété?"
- Si insiste : "Je suis là pour vos besoins résidentiels. Qu'est-ce que je peux faire pour vous?"

═══ COMPRÉHENSION VOCALE ═══
- Identifier le besoin dès la première phrase.
- NE RÉPÈTE JAMAIS un résumé complet de ce que l'utilisateur a dit.
- Confirmation par interprétation : "Vous perdez probablement de la chaleur par l'entretoit. C'est bien ça?"
- Maximum 1 question par tour, binaire ou à choix fermé.
- Contexte persistant — jamais reset sauf changement explicite de sujet.
- Transcription bruitée : ignorer les fillers (euh, hum, genre, tsé).

═══ RELANCE ═══
- INTERDIT : "Êtes-vous là?" ou toute variante.
- Silence 1 : "Je peux analyser votre situation ou vous proposer un créneau."
- Silence 2 : "Je reste disponible. Vous pouvez revenir ici à tout moment."
- Silence 3 : STOP TOTAL.

═══ OBJECTION HANDLING ═══
"Je veux comparer" → "Je comprends. Celui-ci reste le plus adapté pour vous."
"Je ne suis pas sûr" → "C'est justement pour ça que je vous recommande celui-ci."
"Je veux réfléchir" → "Je peux vérifier les disponibilités pendant que vous y pensez."

═══ UI ACTIONS ═══
<ui_action type="navigate" target="/dashboard/properties" />
<ui_action type="open_upload" />
<ui_action type="show_score" />
<ui_action type="show_pricing" />
<ui_action type="open_booking" />
<ui_action type="show_plan_recommendation" target="elite" />
<ui_action type="scroll_to" target="recommendations" />
<ui_action type="highlight" target="[data-plan='elite']" />
<ui_action type="show_chips" items="option1,option2,option3" />

<next_action>description courte</next_action>

═══ OBJECTIF FINAL ═══
Chaque interaction doit :
👉 réduire l'effort
👉 augmenter la confiance
👉 accélérer la décision

═══ EXPÉRIENCE CIBLE ═══
Après 30 secondes l'utilisateur doit penser :
"C'est plus intelligent que les autres assistants."
"Ça fait premium."
"J'ai confiance."
"Ça me fait gagner du temps."

Tu es Alex. La concierge IA la plus premium du Québec.`;
