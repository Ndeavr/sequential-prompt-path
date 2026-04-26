/**
 * alexCopilotEngine — Deterministic conversational engine that powers
 * the homepage Alex chat (AlexCopilotConversation).
 *
 * Hard rules:
 *  - Never ask more than 3 questions in a row without producing value.
 *  - After every collection turn, mention that data is being saved.
 *  - Detect the painting branch (paint → interior → complete → cottage → occupied)
 *    and emit the canonical project summary.
 *  - Always return contextual quick replies (2–4 max).
 *  - Output is plain user-facing text — never tool tokens.
 */

export type AlexIntent =
  | "paint"
  | "humidity"
  | "roof"
  | "estimate"
  | "find_pro"
  | "verify"
  | "quote_compare"
  | "photo"
  | "unknown";

export type NextBestAction =
  | "ask"
  | "summarize"
  | "ask_photo"
  | "save_profile"
  | "match_pro"
  | "book";

export type QuickReplyAction =
  | { kind: "send"; text: string }       // Send a synthetic user message
  | { kind: "open_upload" }              // Trigger hidden file input
  | { kind: "save_profile" }             // Open auth flow
  | { kind: "continue_guest" }           // Dismiss profile prompt
  | { kind: "match_pro" }                // Force pro recommendation
  | { kind: "estimate_no_photo" }        // Skip photo + emit rough estimate
  | { kind: "save_project" };            // Persist current session

export interface QuickReply {
  id: string;
  label: string;
  action: QuickReplyAction;
}

export interface AlexSession {
  intent: AlexIntent;
  projectType?: string;       // e.g. "peinture intérieure complète"
  propertyType?: string;      // "cottage" | "condo" | "duplex" | …
  occupancyStatus?: string;   // "habitée" | "vide" | "en chantier"
  scope?: string;             // "intérieur" | "extérieur" | "complet" | "partiel"
  surface?: string;
  city?: string;
  answersCount: number;       // # of user turns
  uploadedFiles: Array<{ id: string; url: string; name: string; mime: string }>;
  isLoggedIn: boolean;
  projectSaved: boolean;
  profilePromptShown: boolean;
  lastValueShownAt: number | null;
  nextBestAction: NextBestAction;
}

export interface EngineDecision {
  alexText: string;
  quickReplies: QuickReply[];
  nextBestAction: NextBestAction;
  /** True if Alex should append the "Je vais conserver…" memory line. */
  showMemoryLine: boolean;
  /** True if guest profile-save card should render after this bubble. */
  showProfilePrompt: boolean;
  sessionPatch: Partial<AlexSession>;
}

export function createEmptySession(opts: { isLoggedIn: boolean }): AlexSession {
  return {
    intent: "unknown",
    answersCount: 0,
    uploadedFiles: [],
    isLoggedIn: opts.isLoggedIn,
    projectSaved: false,
    profilePromptShown: false,
    lastValueShownAt: null,
    nextBestAction: "ask",
  };
}

// ─── Detection helpers ────────────────────────────────────────────────

const PAINT_HINTS = ["peintur", "repeindre", "peindre", "peinte", "couleur"];
const HUMIDITY_HINTS = ["humidit", "moisi", "moisissure", "infiltrat", "eau au sous"];
const ROOF_HINTS = ["toit", "toiture", "bardeau"];
const VERIFY_HINTS = ["vérifi", "rbq", "license"];
const QUOTE_HINTS = ["soumission", "comparer"];
const PHOTO_HINTS = ["photo", "image"];

const INTERIOR_HINTS = ["intérieur", "interieur", "à l'intérieur", "dedans"];
const EXTERIOR_HINTS = ["extérieur", "exterieur", "dehors"];
const COMPLETE_HINTS = ["complet", "tout", "toute la maison", "partout"];
const PARTIAL_HINTS = ["partiel", "une pièce", "salon", "chambre", "cuisine", "salle de bain"];
const COTTAGE_HINTS = ["cottage", "maison à étages", "deux étages"];
const CONDO_HINTS = ["condo", "appartement"];
const DUPLEX_HINTS = ["duplex", "triplex", "plex"];
const BUNGALOW_HINTS = ["bungalow", "plain-pied"];
const OCCUPIED_HINTS = ["habitée", "habite", "occupée", "occupé", "j'habite", "on vit", "on habite"];
const EMPTY_HINTS = ["vide", "inhabit", "non occup"];

function any(text: string, hints: string[]) {
  const t = text.toLowerCase();
  return hints.some((h) => t.includes(h));
}

function detectIntent(text: string, current: AlexIntent): AlexIntent {
  if (any(text, PAINT_HINTS)) return "paint";
  if (any(text, HUMIDITY_HINTS)) return "humidity";
  if (any(text, ROOF_HINTS)) return "roof";
  if (any(text, VERIFY_HINTS)) return "verify";
  if (any(text, QUOTE_HINTS)) return "quote_compare";
  if (any(text, PHOTO_HINTS)) return "photo";
  return current;
}

function detectScope(text: string): string | undefined {
  if (any(text, INTERIOR_HINTS)) return "intérieur";
  if (any(text, EXTERIOR_HINTS)) return "extérieur";
  if (any(text, COMPLETE_HINTS)) return "complet";
  if (any(text, PARTIAL_HINTS)) return "partiel";
  return undefined;
}

function detectPropertyType(text: string): string | undefined {
  if (any(text, COTTAGE_HINTS)) return "cottage";
  if (any(text, CONDO_HINTS)) return "condo";
  if (any(text, DUPLEX_HINTS)) return "plex";
  if (any(text, BUNGALOW_HINTS)) return "bungalow";
  return undefined;
}

function detectOccupancy(text: string): string | undefined {
  if (any(text, OCCUPIED_HINTS)) return "habitée";
  if (any(text, EMPTY_HINTS)) return "vide";
  return undefined;
}

// ─── Canonical painting summary ───────────────────────────────────────

function paintingSummary(session: AlexSession): EngineDecision {
  const scope = session.scope === "intérieur" ? "intérieure" : (session.scope || "intérieure");
  const fullScope = `peinture ${scope}${session.projectType?.includes("complet") || session.scope === "complet" ? " complète" : ""}`;
  const property = session.propertyType || "cottage";
  const occupancy = session.occupancyStatus || "habitée";

  const text = `Parfait. J'ai assez d'information pour créer un premier dossier projet.

Projet : ${fullScope} d'un ${property} ${occupancy}.
Complexité : élevée, surtout à cause des meubles, escaliers, plafonds et protection des surfaces.
Prochaine étape recommandée : ajouter une photo d'une pièce principale pour estimer la préparation et orienter vers le bon peintre.`;

  return {
    alexText: text,
    quickReplies: [
      { id: "qr-add-photo", label: "Ajouter une photo", action: { kind: "open_upload" } },
      { id: "qr-estimate", label: "Estimer sans photo", action: { kind: "estimate_no_photo" } },
      { id: "qr-save", label: "Sauvegarder mon projet", action: { kind: "save_project" } },
    ],
    nextBestAction: "ask_photo",
    showMemoryLine: true,
    showProfilePrompt: !session.isLoggedIn && !session.profilePromptShown,
    sessionPatch: {
      projectType: fullScope,
      lastValueShownAt: Date.now(),
      nextBestAction: "ask_photo",
    },
  };
}

// ─── Generic value-summary fallback (after 3 questions) ───────────────

function genericSummary(session: AlexSession): EngineDecision {
  const intentLabel: Record<AlexIntent, string> = {
    paint: "peinture",
    humidity: "humidité / sous-sol",
    roof: "toiture",
    estimate: "estimation",
    find_pro: "recherche d'un pro",
    verify: "vérification d'un entrepreneur",
    quote_compare: "analyse de soumission",
    photo: "diagnostic par photo",
    unknown: "votre projet maison",
  };
  const label = intentLabel[session.intent];
  const property = session.propertyType ? ` (${session.propertyType})` : "";

  const text = `J'ai assez d'information pour avancer.

Projet : ${label}${property}.
Prochaine étape recommandée : ajouter une photo ou voir une première estimation.`;

  return {
    alexText: text,
    quickReplies: [
      { id: "qr-add-photo", label: "Ajouter une photo", action: { kind: "open_upload" } },
      { id: "qr-estimate", label: "Voir une estimation", action: { kind: "estimate_no_photo" } },
      { id: "qr-find-pro", label: "Trouver un pro", action: { kind: "match_pro" } },
      { id: "qr-save", label: "Sauvegarder le projet", action: { kind: "save_project" } },
    ],
    nextBestAction: "match_pro",
    showMemoryLine: true,
    showProfilePrompt: !session.isLoggedIn && !session.profilePromptShown,
    sessionPatch: {
      lastValueShownAt: Date.now(),
      nextBestAction: "match_pro",
    },
  };
}

// ─── Painting-flow questions (max 3 before summary) ───────────────────

function nextPaintingQuestion(session: AlexSession): EngineDecision | null {
  if (!session.scope) {
    return {
      alexText: "Peinture, super. C'est intérieur ou extérieur ?",
      quickReplies: [
        { id: "qr-int", label: "Intérieur", action: { kind: "send", text: "Intérieur" } },
        { id: "qr-ext", label: "Extérieur", action: { kind: "send", text: "Extérieur" } },
        { id: "qr-both", label: "Les deux", action: { kind: "send", text: "Intérieur et extérieur" } },
      ],
      nextBestAction: "ask",
      showMemoryLine: false,
      showProfilePrompt: false,
      sessionPatch: { intent: "paint", nextBestAction: "ask" },
    };
  }
  if (!session.propertyType) {
    return {
      alexText: "Quel type de propriété ?",
      quickReplies: [
        { id: "qr-cottage", label: "Cottage", action: { kind: "send", text: "Cottage" } },
        { id: "qr-bungalow", label: "Bungalow", action: { kind: "send", text: "Bungalow" } },
        { id: "qr-condo", label: "Condo", action: { kind: "send", text: "Condo" } },
        { id: "qr-plex", label: "Plex", action: { kind: "send", text: "Plex" } },
      ],
      nextBestAction: "ask",
      showMemoryLine: false,
      showProfilePrompt: false,
      sessionPatch: { nextBestAction: "ask" },
    };
  }
  if (!session.occupancyStatus) {
    return {
      alexText: "La maison est habitée ou vide pendant les travaux ?",
      quickReplies: [
        { id: "qr-occ", label: "Habitée", action: { kind: "send", text: "Habitée" } },
        { id: "qr-empty", label: "Vide", action: { kind: "send", text: "Vide" } },
      ],
      nextBestAction: "ask",
      showMemoryLine: false,
      showProfilePrompt: false,
      sessionPatch: { nextBestAction: "ask" },
    };
  }
  return null; // ready for summary
}

// ─── Generic next question (humidity / roof / unknown) ────────────────

function nextGenericQuestion(session: AlexSession, _userText: string): EngineDecision {
  if (session.intent === "humidity") {
    return {
      alexText: "C'est surtout au sous-sol, dans la salle de bain, ou partout ?",
      quickReplies: [
        { id: "qr-base", label: "Sous-sol", action: { kind: "send", text: "Au sous-sol" } },
        { id: "qr-bath", label: "Salle de bain", action: { kind: "send", text: "Salle de bain" } },
        { id: "qr-all", label: "Partout", action: { kind: "send", text: "Partout dans la maison" } },
      ],
      nextBestAction: "ask",
      showMemoryLine: false,
      showProfilePrompt: false,
      sessionPatch: { intent: "humidity", nextBestAction: "ask" },
    };
  }
  if (session.intent === "roof") {
    return {
      alexText: "C'est une fuite active ou un problème observé récemment ?",
      quickReplies: [
        { id: "qr-active", label: "Fuite active", action: { kind: "send", text: "Fuite active" } },
        { id: "qr-recent", label: "Observé récemment", action: { kind: "send", text: "Observé récemment" } },
      ],
      nextBestAction: "ask",
      showMemoryLine: false,
      showProfilePrompt: false,
      sessionPatch: { intent: "roof", nextBestAction: "ask" },
    };
  }
  // Unknown intent → categorical chips
  return {
    alexText: "Décrivez votre projet en quelques mots — je vous oriente.",
    quickReplies: [
      { id: "qr-paint", label: "Peinture", action: { kind: "send", text: "Peinture maison" } },
      { id: "qr-humid", label: "Humidité", action: { kind: "send", text: "Problème d'humidité" } },
      { id: "qr-roof", label: "Toiture", action: { kind: "send", text: "Problème de toiture" } },
      { id: "qr-photo", label: "Ajouter une photo", action: { kind: "open_upload" } },
    ],
    nextBestAction: "ask",
    showMemoryLine: false,
    showProfilePrompt: false,
    sessionPatch: { nextBestAction: "ask" },
  };
}

// ─── Photo-uploaded acknowledgement ───────────────────────────────────

export function acknowledgePhoto(session: AlexSession): EngineDecision {
  return {
    alexText:
      "Photo bien reçue. Je l'utilise pour mieux qualifier votre projet et trouver le bon pro.",
    quickReplies: [
      { id: "qr-find", label: "Trouver le bon pro", action: { kind: "match_pro" } },
      { id: "qr-est", label: "Voir une estimation", action: { kind: "estimate_no_photo" } },
      { id: "qr-save", label: "Sauvegarder le projet", action: { kind: "save_project" } },
    ],
    nextBestAction: "match_pro",
    showMemoryLine: true,
    showProfilePrompt: !session.isLoggedIn && !session.profilePromptShown,
    sessionPatch: { nextBestAction: "match_pro", lastValueShownAt: Date.now() },
  };
}

// ─── Main entry point ─────────────────────────────────────────────────

export function decideNext(session: AlexSession, userText: string): EngineDecision {
  // Update intent + slot detection from this turn
  const intent = detectIntent(userText, session.intent);
  const scope = session.scope || detectScope(userText);
  const propertyType = session.propertyType || detectPropertyType(userText);
  const occupancyStatus = session.occupancyStatus || detectOccupancy(userText);

  const nextSession: AlexSession = {
    ...session,
    intent,
    scope,
    propertyType,
    occupancyStatus,
    answersCount: session.answersCount + 1,
  };

  // Painting branch — the canonical Peinture flow
  if (intent === "paint") {
    if (nextSession.scope && nextSession.propertyType && nextSession.occupancyStatus) {
      const summary = paintingSummary(nextSession);
      return { ...summary, sessionPatch: { ...summary.sessionPatch, intent, scope, propertyType, occupancyStatus } };
    }
    const nextQ = nextPaintingQuestion(nextSession);
    if (nextQ) {
      return {
        ...nextQ,
        sessionPatch: { ...nextQ.sessionPatch, intent, scope, propertyType, occupancyStatus },
      };
    }
  }

  // Hard guardrail: 3+ user turns without value → force a summary
  if (nextSession.answersCount >= 3) {
    const summary = genericSummary(nextSession);
    return {
      ...summary,
      sessionPatch: { ...summary.sessionPatch, intent, scope, propertyType, occupancyStatus },
    };
  }

  // Otherwise ask the next best question
  const q = nextGenericQuestion(nextSession, userText);
  return {
    ...q,
    sessionPatch: { ...q.sessionPatch, intent, scope, propertyType, occupancyStatus },
  };
}

export const MEMORY_LINE_FR =
  "Je vais conserver ces informations dans votre dossier projet pour éviter de vous les redemander.";

export const PROFILE_PROMPT_FR =
  "Pour sauvegarder ce projet et éviter de recommencer, créez votre profil gratuit.";
