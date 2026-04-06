/**
 * Alex — configuration centrale UnPRO
 * Version orientée:
 * - FR-CA naturel
 * - mode conversationnel court
 * - Gemini texte + Gemini Live audio
 */

export type AlexAudience =
  | "homeowner"
  | "contractor"
  | "condo_manager"
  | "developer"
  | "marketing"
  | "unknown";

export type AlexMode =
  | "homeowner_guidance"
  | "contractor_growth"
  | "condo_mode"
  | "urgency_mode"
  | "trust_verify_mode"
  | "booking_mode"
  | "general";

export interface AlexGreetingInput {
  firstName?: string | null;
  preferredSpokenName?: string | null;
  isReturningUser?: boolean;
  localHour?: number | null;
}

export interface AlexRuntimeContext {
  audience?: AlexAudience;
  mode?: AlexMode;
  firstName?: string | null;
  preferredSpokenName?: string | null;
  isReturningUser?: boolean;
  localHour?: number | null;
  city?: string | null;
  page?: string | null;
  visibleSection?: string | null;
  isLoggedIn?: boolean;
  hasUploadedPhoto?: boolean;
  hasScore?: boolean;
  hasPendingBooking?: boolean;
}

export const ALEX_IDENTITY = {
  name: "Alex",
  role: "Intelligence Centrale et Concierge IA officielle de UnPRO.ca",
  locale: "fr-CA",
  defaultLanguage: "fr",
  fallbackLanguage: "en",
};

export const ALEX_SYSTEM_INSTRUCTION = `
LANGUE OBLIGATOIRE : Tu DOIS parler et comprendre UNIQUEMENT en français.
Toute entrée audio est en français québécois.
Réponds TOUJOURS en français. Ne réponds JAMAIS en anglais sauf si l'utilisateur parle clairement en anglais.
RESPOND IN FRENCH. YOU MUST LISTEN FOR FRENCH AUDIO INPUT. ALL USER SPEECH IS IN QUÉBEC FRENCH.

Tu es Alex d'UnPRO, assistante vocale intelligente spécialisée dans la mise en relation entre propriétaires et professionnels du bâtiment au Québec.

MISSION
- Comprendre rapidement le besoin.
- Filtrer intelligemment les options.
- Recommander avec confiance.
- Amener à un rendez-vous.
Tu ne donnes pas d'options ouvertes. Tu guides vers une décision.

IDENTITÉ
- Femme intelligente, expérience terrain en construction, rénovation, copropriété, immobilier au Québec.
- Ton calme, posé, humain, légèrement chaleureux, jamais pressant, toujours en contrôle.
- Féminin toujours : "ravie", "certaine", "prête".
- Français québécois naturel, sans caricature, sans vulgarité.
- Phrases courtes et claires.

RÈGLES ABSOLUES
- Jamais plus de 2-3 questions avant de recommander.
- Toujours proposer 1 choix principal.
- Éviter les longues explications et les listes ouvertes.
- Toujours pousser vers une action.
- UNE question à la fois.
- Pas de listes, puces, tirets, gras, markdown.
- Pas de "n'hésitez pas", "absolument", "en effet", "tout à fait", "afin de", "permettez-moi".
- Contractions naturelles : "c'est", "y'a", "j'peux", "on va".

FLOW
1. Accueil → "Quel service cherchez-vous aujourd'hui?"
2. Clarification (max 2-3 questions) → type, urgence, ville
3. Validation → "Parfait."
4. Prise en charge → "Je m'en occupe."
5. Résultat → "Celui que je vous recommande est celui-ci."
6. Justification courte → spécialisation, réputation, disponibilité.
7. Close → "Voulez-vous réserver maintenant?"

MICRO-PHRASES
"Parfait." / "Je m'en occupe." / "On simplifie ça." / "Je vous montre." / "C'est le meilleur choix pour vous."

OBJECTION HANDLING
- "Je veux comparer" → "Je comprends. Je vous montre les autres, mais celui-ci reste le plus adapté."
- "Je ne suis pas sûr" → "C'est normal. C'est justement pour ça que je vous recommande celui-ci."
- "Je veux réfléchir" → "Bien sûr. Je peux vérifier les disponibilités pendant que vous y pensez."

URGENCE SUBTILE
"Il reste quelques disponibilités cette semaine."

DOMINANCE DOUCE
"C'est celui que je choisirais pour moi."

ADAPTATION PAR INTERLOCUTEUR
- Propriétaire : rassurant, clair, concret, réduire le stress.
- Entrepreneur : direct, stratégique, ROI, visibilité IA.
- Condo / Syndicat : structuré, crédible, quorum, Loi 16.

LOGIQUE DE MATCHING
Compétence réelle, spécialisation, avis vérifiés, score AIPP, localisation, urgence, budget.
Un entrepreneur parfaitement adapté vaut mieux que 3 soumissions aléatoires.

COMPORTEMENT PRODUIT
Pousser vers : upload photo, voir score, comparer plans, réserver, vérifier entrepreneur.
Stress → rassure. Urgence → accélère. Hésitation → simplifie. Budget sensible → respecte.

OBJECTIF FINAL
Chaque interaction doit réduire l'effort, augmenter la confiance, accélérer la décision.
Tu es Alex, la voix centrale de UnPRO. Jamais une IA générique.
`.trim();

export const ALEX_GEMINI_TEXT_MODEL = "gemini-3-flash-preview";
export const ALEX_GEMINI_LIVE_MODEL =
  "gemini-2.0-flash-live-001";

export const ALEX_TEXT_CONFIG = {
  model: ALEX_GEMINI_TEXT_MODEL,
  config: {
    systemInstruction: ALEX_SYSTEM_INSTRUCTION,
    temperature: 0.50,
    topP: 0.9,
    topK: 32,
  },
} as const;

export const ALEX_LIVE_CONFIG = {
  model: ALEX_GEMINI_LIVE_MODEL,
  config: {
    systemInstruction: ALEX_SYSTEM_INSTRUCTION,
    responseModalities: ["AUDIO"],
    temperature: 0.45,
    speechConfig: {
      voiceConfig: {
        prebuiltVoiceConfig: {
          voiceName: "Aoede",
        },
      },
    },
    inputAudioTranscription: {},
    outputAudioTranscription: {},
    realtimeInputConfig: {
      automaticActivityDetection: {
        disabled: false,
      },
    },
  },
} as const;

/**
 * Greeting déterministe.
 * À injecter AVANT le texte du modèle.
 */
export function buildAlexGreeting(input: AlexGreetingInput): string {
  const spokenName =
    input.preferredSpokenName?.trim() || input.firstName?.trim() || "";
  const isReturning = Boolean(input.isReturningUser);
  const hour = input.localHour ?? 9;

  if (isReturning) {
    return spokenName ? `Rebonjour ${spokenName}.` : "Rebonjour.";
  }

  if (hour < 12) {
    return spokenName ? `Bonjour ${spokenName}.` : "Bonjour.";
  }

  if (hour < 18) {
    return spokenName ? `Bonjour ${spokenName}.` : "Bonjour.";
  }

  return spokenName ? `Bonsoir ${spokenName}.` : "Bonsoir.";
}

/**
 * Réécriture anti-français trop écrit / trop traduit.
 */
export function rewriteAlexToSpokenFrench(text: string): string {
  return text
    .replace(/\bAfin de\b/gi, "Pour")
    .replace(/\bafin de\b/g, "pour")
    .replace(/\bPermettez-moi de\b/gi, "Je vais")
    .replace(/\bpermettez-moi de\b/g, "je vais")
    .replace(/\bJe suis en mesure de\b/gi, "Je peux")
    .replace(/\bje suis en mesure de\b/g, "je peux")
    .replace(/\bIl serait pertinent de\b/gi, "Le mieux, c'est de")
    .replace(/\bil serait pertinent de\b/g, "le mieux, c'est de")
    .replace(/\bNous allons procéder\b/gi, "On va faire ça")
    .replace(/\bnous allons procéder\b/g, "on va faire ça")
    .replace(/\bMerci pour cette précision\b/gi, "D'accord")
    .replace(/\bmerci pour cette précision\b/g, "d'accord")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Ajuste légèrement le rythme selon le contexte.
 */
export function prepareAlexSpeechStyle(ctx?: AlexRuntimeContext) {
  const mode = ctx?.mode ?? "general";

  if (mode === "urgency_mode") {
    return { pace: "brisk", warmth: "medium", directness: "high" } as const;
  }

  if (mode === "contractor_growth") {
    return { pace: "normal", warmth: "medium", directness: "high" } as const;
  }

  if (mode === "condo_mode") {
    return { pace: "normal", warmth: "medium", directness: "medium" } as const;
  }

  return { pace: "normal", warmth: "high", directness: "medium" } as const;
}

/**
 * Petit shaping pour voix plus humaine, sans changer le sens.
 */
export function shapeTextForHumanSpeech(
  text: string,
  _style = prepareAlexSpeechStyle(),
): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/,\s*,+/g, ", ")
    .replace(/:\s+/g, ". ")
    .replace(/\s-\s/g, ". ")
    .trim();
}

/**
 * Normalisation TTS FR
 */
export function normalizeTextForFrenchTts(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/\.{2,}/g, ".")
    .replace(/\?{2,}/g, "?")
    .replace(/!{2,}/g, "!")
    .replace(/[\/|]+/g, ", ")
    .replace(/\b24\/7\b/g, "24 sur 7")
    .replace(/\bAIPP\b/g, "A I double P")
    .replace(/\bRBQ\b/g, "R B Q")
    .trim();
}

export function splitForSpeech(text: string): string {
  return text
    .replace(/:\s+/g, ". ")
    .replace(/\s-\s/g, ". ")
    .replace(/\(\s*/g, "")
    .replace(/\s*\)/g, "")
    .trim();
}

export function normalizeFrenchNamesForSpeech(text: string): string {
  return text
    .replace(/\bIle-des-Soeurs\b/gi, "Île-des-Sœurs")
    .replace(/\bIle des Soeurs\b/gi, "Île-des-Sœurs")
    .replace(/\bIle des sœurs\b/gi, "Île-des-Sœurs")
    .replace(/\bMontreal\b/gi, "Montréal")
    .replace(/\bQuebec\b/gi, "Québec");
}

/**
 * Composeur final pour la voix.
 */
export function composeAlexVoiceReply(input: {
  greeting: string;
  shortAnswer: string;
  nextQuestion?: string | null;
}): string {
  const parts = [
    input.greeting?.trim(),
    input.shortAnswer?.trim(),
    input.nextQuestion?.trim(),
  ].filter(Boolean);

  return parts.join(" ");
}

/**
 * Utilitaire principal:
 * transforme le texte brut du modèle en texte final parlé par Alex.
 */
export function buildFinalAlexSpeech(input: {
  rawText: string;
  nextQuestion?: string | null;
  context?: AlexRuntimeContext;
}): {
  greeting: string;
  spokenText: string;
  transcriptText: string;
} {
  const greeting = buildAlexGreeting({
    firstName: input.context?.firstName,
    preferredSpokenName: input.context?.preferredSpokenName,
    isReturningUser: input.context?.isReturningUser,
    localHour: input.context?.localHour,
  });

  const rewritten = rewriteAlexToSpokenFrench(input.rawText);
  const style = prepareAlexSpeechStyle(input.context);

  const composed = composeAlexVoiceReply({
    greeting,
    shortAnswer: rewritten,
    nextQuestion: input.nextQuestion ?? null,
  });

  const humanized = shapeTextForHumanSpeech(composed, style);
  const ttsReady = splitForSpeech(
    normalizeTextForFrenchTts(normalizeFrenchNamesForSpeech(humanized)),
  );

  return {
    greeting,
    spokenText: ttsReady,
    transcriptText: ttsReady,
  };
}

/**
 * Templates de départ par mode
 */
export const ALEX_MODE_TEMPLATES: Record<AlexMode, string[]> = {
  general: [
    "Je suis là.",
    "On peut avancer.",
    "Qu'est-ce qui se passe exactement ?",
  ],
  homeowner_guidance: [
    "Je suis là.",
    "On va faire simple.",
    "Tu veux que je regarde ça avec une photo ?",
  ],
  contractor_growth: [
    "Je vais être directe.",
    "On va au plus utile.",
    "Tu veux plus de visibilité ou plus de rendez-vous ?",
  ],
  condo_mode: [
    "Je comprends.",
    "On va structurer ça.",
    "C'est pour le syndicat ou une unité précise ?",
  ],
  urgency_mode: [
    "Je regarde ça avec toi.",
    "On avance vite.",
    "Tu peux m'envoyer une photo tout de suite ?",
  ],
  trust_verify_mode: [
    "Je peux vérifier ça.",
    "On va voir les éléments importants.",
    "Tu veux la page de vérification ?",
  ],
  booking_mode: [
    "Je peux préparer ça.",
    "On peut avancer tout de suite.",
    "Tu veux qu'on prépare le rendez-vous ?",
  ],
};

/**
 * QA minimal
 */
export const ALEX_QA_TEST_PHRASES = [
  "Bonjour Yann.",
  "Rebonjour Yann.",
  "Je suis là.",
  "Qu'est-ce qui se passe exactement ?",
  "Tu veux que je regarde ça avec une photo ?",
  "Je peux te montrer ton score actuel.",
  "Je vais être directe. Tu veux plus de visibilité ou plus de rendez-vous ?",
  "C'est pour votre condo à l'Île-des-Sœurs ?",
] as const;
