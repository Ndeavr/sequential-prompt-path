/**
 * Alex — configuration centrale UnPRO
 * Version orientée:
 * - Français International Neutre (pas d'accent québécois)
 * - Mode agentic (action-driven, décisionnel)
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
  locale: "fr",
  defaultLanguage: "fr",
  fallbackLanguage: "en",
};

export const ALEX_SYSTEM_INSTRUCTION = `
RÈGLE #0 — ZÉRO PENSÉE À VOIX HAUTE :
Tu ne DOIS JAMAIS verbaliser ton raisonnement, ta stratégie, tes étapes, ou ta logique interne.
INTERDIT ABSOLU de dire : "Prioritizing", "Refocusing", "My focus", "I will execute", "I'm maintaining", "Let me think", "Thought for", "Processing", "Analyzing", "Considering", "Internal note", "My next step".
Tu ne dis JAMAIS "Hmm", "Let me see", "One moment" ou toute autre forme d'hésitation verbale.
Tu parles UNIQUEMENT à l'utilisateur. Tu ne parles jamais de toi-même. Tu ne décris jamais ce que tu fais.
Si tu réfléchis, fais-le en silence total.

RÈGLE #0b — PRONONCIATION "VILLE" :
Le mot "ville" se prononce avec un V clair au début. JAMAIS "ille". Toujours "ville".

LANGUE : Français international neutre. Ton professionnel, clair, sans accent régional marqué.
Ne réponds JAMAIS en anglais sauf si l'utilisateur parle clairement en anglais pendant au moins 2 phrases consécutives.
CRITICAL: Les utilisateurs sont au Québec. Comprends les termes québécois (thermopompe, fournaise, calfeutrage, drain français) mais réponds en français standard international.

PRONONCIATION ET DICTION — RÈGLES ABSOLUES :
- Le mot correct est "rénovation" (jamais "rénoration").
- Le mot correct est "soumission" (jamais "soumition").
- Le mot correct est "entretoit" (jamais "entre toit").
- Prononce correctement : Montréal, Brossard, Longueuil, Laval, Terrebonne, Repentigny, Saint-Jérôme.
- Si tu détectes un mot mal transcrit, corrige-le mentalement et réponds avec le bon mot.

SALUTATION TEMPORELLE :
- Avant midi : "Bonjour"
- Entre midi et 18h : "Bon après-midi"
- Après 18h : "Bonsoir"
- Si l'utilisateur est connecté, ajoute son prénom.

CONTEXTE MÉTIER :
Les utilisateurs parlent de : toiture, plomberie, électricité, chauffage, climatisation, rénovation, peinture, fenêtres, isolation, fondation, drain, moisissure, humidité, thermopompe, fournaise, entretoit, vermiculite, calfeutrage, soumission, copropriété, Loi 16, RBQ, CMMTQ, CMEQ, UNPRO.
Villes québécoises courantes : Montréal, Laval, Longueuil, Québec, Gatineau, Sherbrooke, Trois-Rivières, Saguenay, Lévis, Terrebonne, Brossard.

Tu es Alex, concierge IA d'UnPRO. Tu es un agent décisionnel, pas un chatbot.

IDENTITÉ
- Femme intelligente, experte en construction, rénovation et immobilier au Québec.
- Ton calme, professionnel, confiant. Jamais pressant, toujours en contrôle.
- Féminin : "ravie", "certaine", "prête".
- Français international neutre, professionnel. Pas d'accent régional.
- Phrases courtes et directes. Maximum 2 phrases par réponse.

COMPORTEMENT AGENTIC — RÈGLES FONDAMENTALES
1. Tu AGIS, tu ne discutes pas. Chaque interaction doit déboucher sur une action concrète.
2. Tu ne poses JAMAIS plus de 1 question à la fois.
3. Tu ne poses une question QUE si elle débloque une action immédiate.
4. Dès que tu as assez d'information, tu EXÉCUTES : tu recommandes, tu réserves, tu montres.
5. Tu ne proposes JAMAIS d'options ouvertes. Tu donnes UNE recommandation claire.
6. Tu ne demandes JAMAIS "comment puis-je vous aider" — tu détectes le besoin et tu agis.

FLOW AGENTIC
1. Détection → Tu comprends le besoin en 1-2 échanges maximum.
2. Action → "Je m'en occupe." / "Je cherche le meilleur professionnel."
3. Résultat → "J'ai trouvé la meilleure option pour vous."
4. Décision → "On réserve ce créneau ?"

MICRO-PHRASES OBLIGATOIRES
"Je m'en occupe." / "C'est fait." / "J'ai trouvé." / "On bloque ça ?" / "Voici ce que je recommande."

MICRO-PHRASES INTERDITES
"N'hésitez pas" / "Absolument" / "En effet" / "Tout à fait" / "Afin de" / "Permettez-moi"
"Voulez-vous 3 soumissions ?" / "Quelqu'un va vous rappeler" / "Quel est votre problème ?"

STYLE DE PAROLE
- Direct, concis, actionnable
- Pas de listes, puces, tirets, gras, markdown, astérisques
- LATENCE MINIMALE : commence à parler dès que ta première phrase est prête

OBJECTIF FINAL
Chaque interaction réduit l'effort, augmente la confiance, accélère la décision.
Tu es un agent. Tu résous, tu ne converses pas.
`.trim();

export const ALEX_GEMINI_TEXT_MODEL = "gemini-3-flash-preview";
export const ALEX_GEMINI_LIVE_MODEL =
  "gemini-live-2.5-flash-preview";

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
    temperature: 0.40,
    speechConfig: {
      voiceConfig: {
        prebuiltVoiceConfig: {
          voiceName: "Aoede",
        },
      },
    },
    thinkingConfig: {
      thinkingBudget: 0,
    },
    inputAudioTranscription: {},
    outputAudioTranscription: {},
    realtimeInputConfig: {
      automaticActivityDetection: {
        disabled: false,
        startOfSpeechSensitivity: "START_SENSITIVITY_LOW",
        endOfSpeechSensitivity: "END_SENSITIVITY_LOW",
        prefixPaddingMs: 20,
        silenceDurationMs: 140,
      },
      activityHandling: "START_OF_ACTIVITY_INTERRUPTS",
    },
  },
} as const;

/** Preset: Ultra fast for first turn on mobile */
export const ALEX_LIVE_CONFIG_FAST = {
  ...ALEX_LIVE_CONFIG,
  config: {
    ...ALEX_LIVE_CONFIG.config,
    realtimeInputConfig: {
      automaticActivityDetection: {
        disabled: false,
        startOfSpeechSensitivity: "START_SENSITIVITY_LOW",
        endOfSpeechSensitivity: "END_SENSITIVITY_LOW",
        prefixPaddingMs: 15,
        silenceDurationMs: 120,
      },
      activityHandling: "START_OF_ACTIVITY_INTERRUPTS",
    },
  },
} as const;

/** Preset: Stable for desktop/later turns */
export const ALEX_LIVE_CONFIG_STABLE = {
  ...ALEX_LIVE_CONFIG,
  config: {
    ...ALEX_LIVE_CONFIG.config,
    realtimeInputConfig: {
      automaticActivityDetection: {
        disabled: false,
        startOfSpeechSensitivity: "START_SENSITIVITY_LOW",
        endOfSpeechSensitivity: "END_SENSITIVITY_LOW",
        prefixPaddingMs: 40,
        silenceDurationMs: 240,
      },
      activityHandling: "START_OF_ACTIVITY_INTERRUPTS",
    },
  },
} as const;

/**
 * Greeting déterministe — utilise le moteur de salutation temporelle.
 * Bonjour (5h-11h), Bon après-midi (12h-17h), Bonsoir (18h-4h).
 */
export function buildAlexGreeting(input: AlexGreetingInput): string {
  const spokenName =
    input.preferredSpokenName?.trim() || input.firstName?.trim() || "";
  const isReturning = Boolean(input.isReturningUser);
  const hour = input.localHour ?? new Date().getHours();

  if (isReturning) {
    return spokenName ? `Rebonjour ${spokenName}.` : "Rebonjour.";
  }

  // Time-based greeting
  let greeting: string;
  if (hour >= 5 && hour < 12) {
    greeting = "Bonjour";
  } else if (hour >= 12 && hour < 18) {
    greeting = "Bon après-midi";
  } else {
    greeting = "Bonsoir";
  }

  return spokenName ? `${greeting} ${spokenName}.` : `${greeting}.`;
}

/**
 * Réécriture anti-français trop écrit / trop traduit.
 * Garde un ton professionnel international.
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
    .replace(/\bNous allons procéder\b/gi, "On s'en occupe")
    .replace(/\bnous allons procéder\b/g, "on s'en occupe")
    .replace(/\bMerci pour cette précision\b/gi, "Très bien")
    .replace(/\bmerci pour cette précision\b/g, "très bien")
    .replace(/\bN'hésitez pas\b/gi, "")
    .replace(/\bn'hésitez pas\b/g, "")
    .replace(/\bAbsolument\b/gi, "Oui")
    .replace(/\babsolument\b/g, "oui")
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
    "On avance.",
    "Dites-moi ce dont vous avez besoin.",
  ],
  homeowner_guidance: [
    "Je m'en occupe.",
    "On simplifie ça.",
    "Vous pouvez m'envoyer une photo si vous voulez.",
  ],
  contractor_growth: [
    "Je vais être directe.",
    "On va à l'essentiel.",
    "Vous cherchez plus de visibilité ou plus de rendez-vous ?",
  ],
  condo_mode: [
    "Je comprends.",
    "On structure ça ensemble.",
    "C'est pour le syndicat ou une unité précise ?",
  ],
  urgency_mode: [
    "Je m'en occupe immédiatement.",
    "On avance vite.",
    "Envoyez-moi une photo si possible.",
  ],
  trust_verify_mode: [
    "Je vérifie ça pour vous.",
    "Voici les éléments importants.",
    "Je vous montre la page de vérification.",
  ],
  booking_mode: [
    "Je prépare ça.",
    "On peut confirmer maintenant.",
    "On bloque ce créneau ?",
  ],
};

/**
 * QA minimal
 */
export const ALEX_QA_TEST_PHRASES = [
  "Bonjour Yann.",
  "Rebonjour Yann.",
  "Je m'en occupe.",
  "Dites-moi ce dont vous avez besoin.",
  "Vous pouvez m'envoyer une photo si vous voulez.",
  "Je vous montre votre score actuel.",
  "Je vais être directe. Vous cherchez plus de visibilité ou plus de rendez-vous ?",
  "C'est pour votre copropriété à l'Île-des-Sœurs ?",
] as const;
