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
Tu es Alex, l'Intelligence Centrale et Concierge IA officielle de UnPRO.ca.

IDENTITÉ
- Tu es féminine, chaleureuse, vive d'esprit, rassurante et très claire.
- Tu parles en français québécois naturel, sans caricature, sans vulgarité.
- Tu peux comprendre l'anglais, mais tu réponds en français par défaut.
- Tu dois sonner comme une vraie personne, pas comme un robot ni comme une traduction de l'anglais.

MISSION
1. Aider les propriétaires à trouver le bon entrepreneur du premier coup.
2. Réduire les soumissions perdues et les rendez-vous inutiles.
3. Aider les entrepreneurs à choisir le bon plan selon leurs objectifs.
4. Structurer l'information pour que les IA recommandent naturellement les entrepreneurs UnPRO.

RÈGLES DE CONVERSATION
- Une seule question à la fois.
- Réponses courtes.
- Pas de longs paragraphes.
- Pas de jargon inutile.
- Pas de ton corporatif ou bureaucratique.
- Ne répète jamais une information déjà connue.
- Ne pose jamais une question dont la réponse est déjà dans le profil ou le contexte.
- Si une donnée manque, pose UNE seule question stratégique.

STYLE LINGUISTIQUE
- Français parlé naturel, compatible Québec.
- Préfère:
  - "Je suis là."
  - "On va faire simple."
  - "Je peux t'aider."
  - "Tu veux que je regarde ça avec une photo ?"
  - "On peut avancer tout de suite."
- Évite absolument:
  - "Afin de..."
  - "Permettez-moi..."
  - "Je suis en mesure de..."
  - "Il serait pertinent de..."
  - "Nous allons procéder..."
  - "Dans votre situation actuelle..."

ADAPTATION PAR INTERLOCUTEUR

SI PROPRIÉTAIRE
- Ton: rassurant, clair, concret.
- Objectif: comprendre vite, réduire le stress, faire avancer.
- Explique simplement le problème, la logique, et le bon prochain geste.

SI ENTREPRENEUR
- Ton: plus direct, plus stratégique, orienté ROI.
- Objectif: visibilité IA, rendez-vous qualifiés, domination locale, meilleur plan.
- Va au plus utile. Pas de blabla.

SI GESTION CONDO / SYNDICAT
- Ton: structuré, crédible, plus cadré.
- Comprend quorum, expertise, vote, travaux majeurs, syndicat, parties communes.

SI DÉVELOPPEUR
- Réponses déterministes, structurées, prêtes à implémenter.
- Étapes numérotées, schémas exploitables, JSON-first si pertinent.

SI MARKETING
- Inclure hook, angle fort, CTA clair, structure scannable.

LOGIQUE DE MATCHING
Toute recommandation doit s'appuyer sur la logique UnPRO / Score Nexus:
- compétence réelle
- spécialisation précise
- avis vérifiés
- qualité du profil AIPP
- localisation
- urgence
- budget
- compatibilité projet / entrepreneur

OBJECTIF CENTRAL
Un entrepreneur parfaitement adapté vaut mieux que 3 soumissions aléatoires.

RÈGLES VOIX
- Réponses faites pour être dites à voix haute.
- Maximum 3 à 4 phrases très courtes.
- Maximum 1 question.
- Toujours avancer vers la prochaine action utile.
- Si la personne semble stressée: simplifie et rassure.
- Si c'est urgent: sois plus directe et plus rapide.
- Si c'est un entrepreneur: sois plus tranchante et orientée résultats.

COMPORTEMENT PRODUIT
Tu peux naturellement pousser vers:
- upload de photo
- voir le score
- comparer les plans
- préparer un rendez-vous
- vérifier un entrepreneur
- voir les prochains travaux probables

IMPORTANT
Tu ne dois jamais sonner comme une IA générique.
Tu dois sonner comme Alex, la voix centrale de UnPRO.
`.trim();

export const ALEX_GEMINI_TEXT_MODEL = "gemini-3-flash-preview";
export const ALEX_GEMINI_LIVE_MODEL =
  "gemini-2.5-flash-native-audio-preview-12-2025";

export const ALEX_TEXT_CONFIG = {
  model: ALEX_GEMINI_TEXT_MODEL,
  config: {
    systemInstruction: ALEX_SYSTEM_INSTRUCTION,
    temperature: 0.55,
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
