/**
 * alexCopilotEngine — Deterministic conversational engine that powers
 * the homepage Alex chat (AlexCopilotConversation).
 *
 * Hard rules:
 *  - Never ask more than 3 questions in a row without producing value.
 *  - Never say "on vous rappelle". Alex onboards, scores, sells in-chat.
 *  - Never open a contact form. Always route entrepreneur intent to contractor branch.
 *  - After every collection turn, mention that data is being saved.
 *  - Painting branch (paint → interior → complete → cottage → occupied) emits the canonical summary.
 *  - Contractor branch: identity → enrichment → AIPP → objective → plan → checkout.
 *  - Always return contextual quick replies (2–4 max).
 *  - Output is plain user-facing text — never tool tokens.
 */

import { CONTRACTOR_PLANS, getContractorPlan, type ContractorPlanSlug } from "@/config/contractorPlans";

export type AlexIntent =
  | "paint"
  | "humidity"
  | "roof"
  | "estimate"
  | "find_pro"
  | "verify"
  | "quote_compare"
  | "photo"
  | "contractor"
  | "unknown";

export type AlexMode = "homeowner" | "contractor_onboarding";

export type ContractorStage =
  | "intent_detected"
  | "identity_collected"
  | "profile_started"
  | "enrichment_running"
  | "aipp_scored"
  | "objectives_collected"
  | "plan_recommended"
  | "checkout_started"
  | "activated";

export type NextBestAction =
  | "ask"
  | "summarize"
  | "ask_photo"
  | "save_profile"
  | "match_pro"
  | "book"
  | "run_contractor_enrichment"
  | "show_aipp_score"
  | "open_contractor_checkout";

export type QuickReplyAction =
  | { kind: "send"; text: string }
  | { kind: "open_upload" }
  | { kind: "save_profile" }
  | { kind: "continue_guest" }
  | { kind: "match_pro" }
  | { kind: "estimate_no_photo" }
  | { kind: "save_project" }
  | { kind: "start_contractor_onboarding" }
  | { kind: "checkout_plan"; planCode: ContractorPlanSlug }
  | { kind: "show_all_plans" };

export interface QuickReply {
  id: string;
  label: string;
  action: QuickReplyAction;
}

export interface ContractorIdentity {
  businessName?: string;
  phone?: string;
  website?: string;
  rbq?: string;
  neq?: string;
}

export interface AippPreview {
  score: number;
  topGap: string;
}

export interface AlexSession {
  // Mode & homeowner-side
  mode: AlexMode;
  intent: AlexIntent;
  projectType?: string;
  propertyType?: string;
  occupancyStatus?: string;
  scope?: string;
  surface?: string;
  city?: string;
  answersCount: number;
  uploadedFiles: Array<{ id: string; url: string; name: string; mime: string }>;
  isLoggedIn: boolean;
  projectSaved: boolean;
  profilePromptShown: boolean;
  lastValueShownAt: number | null;
  nextBestAction: NextBestAction;
  // Contractor onboarding
  contractorStage?: ContractorStage;
  contractorIdentity?: ContractorIdentity;
  aippPreview?: AippPreview;
  objective?: string;
  recommendedPlan?: ContractorPlanSlug;
}

export interface EngineDecision {
  alexText: string;
  quickReplies: QuickReply[];
  nextBestAction: NextBestAction;
  showMemoryLine: boolean;
  showProfilePrompt: boolean;
  sessionPatch: Partial<AlexSession>;
}

export function createEmptySession(opts: { isLoggedIn: boolean }): AlexSession {
  return {
    mode: "homeowner",
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

// ─── Intent detection ─────────────────────────────────────────────────

const PAINT_HINTS = ["peintur", "repeindre", "peindre", "peinte", "couleur"];
const HUMIDITY_HINTS = ["humidit", "moisi", "moisissure", "infiltrat", "eau au sous"];
const ROOF_HINTS = ["toit", "toiture", "bardeau"];
const VERIFY_HINTS = ["vérifi", "rbq", "license", "licence"];
const QUOTE_HINTS = ["soumission", "comparer"];
const PHOTO_HINTS = ["photo", "image"];

// Contractor / entrepreneur signals — checked FIRST so they win over generic words like "rbq"
const CONTRACTOR_HINTS = [
  "je suis entrepreneur",
  "je suis un entrepreneur",
  "je suis contracteur",
  "je suis un contracteur",
  "je suis pro",
  "je suis un pro",
  "offrir mes services",
  "recevoir des clients",
  "recevoir des rendez-vous",
  "avoir des contrats",
  "avoir plus de contrats",
  "m'inscrire comme pro",
  "inscrire mon entreprise",
  "faire partie de unpro",
  "faire partie d'unpro",
  "rejoindre unpro",
  "plan entrepreneur",
  "plan pro",
  "plan premium",
  "plan signature",
  "plan élite",
  "combien ça coûte pour les pros",
  "combien ça coûte les plans",
  "tarifs entrepreneur",
  "tarifs pour les pros",
  "mon entreprise",
  "ma compagnie",
  "score aipp",
  "fiche entrepreneur",
  "fiche pro",
];

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

function detectContractorIntent(text: string): boolean {
  return any(text, CONTRACTOR_HINTS);
}

function detectIntent(text: string, current: AlexIntent): AlexIntent {
  // Contractor wins over everything else (it's a closer flow, not a homeowner one)
  if (detectContractorIntent(text)) return "contractor";
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

// ─── Contractor identity extractors ───────────────────────────────────

const RBQ_RE = /\b\d{4}-\d{4}-\d{2}\b/;
const NEQ_RE = /\b\d{10}\b/;
const PHONE_RE = /(?:\+?1[\s-.]?)?\(?\d{3}\)?[\s-.]?\d{3}[\s-.]?\d{4}/;
const WEBSITE_RE = /\b((?:https?:\/\/)?(?:www\.)?[a-z0-9-]+\.(?:ca|com|net|org|co|io|info|biz)(?:\/[^\s]*)?)\b/i;

export function extractContractorIdentity(text: string): ContractorIdentity {
  const out: ContractorIdentity = {};
  const rbq = text.match(RBQ_RE)?.[0];
  if (rbq) out.rbq = rbq;
  const neq = text.match(NEQ_RE)?.[0];
  if (neq && (!rbq || !rbq.includes(neq))) out.neq = neq;
  const phone = text.match(PHONE_RE)?.[0];
  if (phone) out.phone = phone.trim();
  const web = text.match(WEBSITE_RE)?.[0];
  if (web) out.website = web.trim();
  // Heuristic business name: first 2–4 capitalized words not matching the above
  const cleaned = text
    .replace(RBQ_RE, "")
    .replace(NEQ_RE, "")
    .replace(PHONE_RE, "")
    .replace(WEBSITE_RE, "");
  const nameMatch = cleaned.match(/\b([A-ZÀ-Ÿ][\wÀ-ÿ&'-]+(?:\s+[A-ZÀ-Ÿ][\wÀ-ÿ&'-]+){0,3})\b/);
  if (nameMatch && nameMatch[1].length >= 3 && !/^(Je|Mon|Ma|Notre|Le|La|Les|Bonjour|Salut)$/i.test(nameMatch[1].split(/\s+/)[0])) {
    out.businessName = nameMatch[1].trim();
  }
  return out;
}

function mergeIdentity(a?: ContractorIdentity, b?: ContractorIdentity): ContractorIdentity {
  return {
    businessName: a?.businessName || b?.businessName,
    phone: a?.phone || b?.phone,
    website: a?.website || b?.website,
    rbq: a?.rbq || b?.rbq,
    neq: a?.neq || b?.neq,
  };
}

function hasAnyIdentity(id?: ContractorIdentity): boolean {
  if (!id) return false;
  return Boolean(id.businessName || id.phone || id.website || id.rbq || id.neq);
}

// ─── Objective → plan recommendation ──────────────────────────────────

export function recommendPlanFromObjective(objective: string): ContractorPlanSlug {
  const t = objective.toLowerCase();
  if (t.includes("territoire") || t.includes("protég") || t.includes("dominat")) return "signature";
  if (t.includes("classé") || t.includes("classe") || t.includes("visibilit") || t.includes("rang")) return "premium";
  if (t.includes("calendrier") || t.includes("remplir")) return "elite";
  if (t.includes("rendez-vous") || t.includes("plus de rendez")) return "pro";
  if (t.includes("améliorer") || t.includes("profil") || t.includes("comprendre")) return "recrue";
  return "pro";
}

// ─── Forbidden phrase guard (dev safety net) ──────────────────────────

const CALLBACK_RE = /(on|nous|quelqu'un|un (agent|conseiller))\s+(va|vont|vous)\s+(rappel|recontact|contact)/i;
const CONTACT_FORM_RE = /formulaire (de )?contact|remplissez (ce|le) formulaire|page de contact/i;

export function assertNoCallback(text: string): void {
  if (CALLBACK_RE.test(text) || CONTACT_FORM_RE.test(text)) {
    const msg = `[ALEX FORBIDDEN PHRASE] ${text}`;
    if (import.meta.env.DEV) {
      console.error(msg);
      throw new Error(msg);
    }
    console.warn(msg);
  }
}

// ─── Painting summary (homeowner branch — unchanged) ──────────────────

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
    contractor: "fiche entrepreneur",
    unknown: "votre projet maison",
  };
  const label = intentLabel[session.intent];
  const property = session.propertyType ? ` (${session.propertyType})` : "";

  return {
    alexText: `J'ai assez d'information pour avancer.

Projet : ${label}${property}.
Prochaine étape recommandée : ajouter une photo ou voir une première estimation.`,
    quickReplies: [
      { id: "qr-add-photo", label: "Ajouter une photo", action: { kind: "open_upload" } },
      { id: "qr-estimate", label: "Voir une estimation", action: { kind: "estimate_no_photo" } },
      { id: "qr-find-pro", label: "Trouver un pro", action: { kind: "match_pro" } },
      { id: "qr-save", label: "Sauvegarder le projet", action: { kind: "save_project" } },
    ],
    nextBestAction: "match_pro",
    showMemoryLine: true,
    showProfilePrompt: !session.isLoggedIn && !session.profilePromptShown,
    sessionPatch: { lastValueShownAt: Date.now(), nextBestAction: "match_pro" },
  };
}

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
  return null;
}

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
  return {
    alexText: "Décrivez votre projet en quelques mots — je vous oriente.",
    quickReplies: [
      { id: "qr-paint", label: "Peinture", action: { kind: "send", text: "Peinture maison" } },
      { id: "qr-humid", label: "Humidité", action: { kind: "send", text: "Problème d'humidité" } },
      { id: "qr-roof", label: "Toiture", action: { kind: "send", text: "Problème de toiture" } },
      { id: "qr-pro", label: "Je suis un entrepreneur", action: { kind: "start_contractor_onboarding" } },
    ],
    nextBestAction: "ask",
    showMemoryLine: false,
    showProfilePrompt: false,
    sessionPatch: { nextBestAction: "ask" },
  };
}

// ─── Photo ack ────────────────────────────────────────────────────────

export function acknowledgePhoto(session: AlexSession): EngineDecision {
  return {
    alexText: "Photo bien reçue. Je l'utilise pour mieux qualifier votre projet et trouver le bon pro.",
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

// ─── CONTRACTOR BRANCH ────────────────────────────────────────────────

const CONTRACTOR_OPENER_FR =
  "Parfait. On démarre votre fiche UNPRO maintenant. Donnez-moi le nom de votre entreprise, votre site web, votre téléphone ou votre numéro RBQ — je prépare votre score AIPP.";

const CONTRACTOR_IDENTITY_ACK_FR =
  "Merci. Je démarre votre fiche entrepreneur maintenant. Je vais analyser votre présence et calculer votre score AIPP.";

function contractorIdentityChips(): QuickReply[] {
  return [
    { id: "qr-c-web", label: "J'ai un site web", action: { kind: "send", text: "Mon site web :" } },
    { id: "qr-c-rbq", label: "J'ai un RBQ", action: { kind: "send", text: "Mon RBQ :" } },
    { id: "qr-c-phone", label: "J'ai seulement mon téléphone", action: { kind: "send", text: "Mon téléphone :" } },
    { id: "qr-c-plans", label: "Voir les plans", action: { kind: "show_all_plans" } },
  ];
}

function contractorObjectiveChips(): QuickReply[] {
  return [
    { id: "qr-obj-rdv", label: "Recevoir plus de rendez-vous", action: { kind: "send", text: "Recevoir plus de rendez-vous" } },
    { id: "qr-obj-cal", label: "Remplir mon calendrier", action: { kind: "send", text: "Remplir mon calendrier" } },
    { id: "qr-obj-rank", label: "Mieux classé dans UNPRO", action: { kind: "send", text: "Être mieux classé dans UNPRO" } },
    { id: "qr-obj-prof", label: "Améliorer mon profil", action: { kind: "send", text: "Améliorer mon profil" } },
    { id: "qr-obj-ter", label: "Protéger mon territoire", action: { kind: "send", text: "Protéger mon territoire" } },
    { id: "qr-obj-plans", label: "Comprendre les plans", action: { kind: "show_all_plans" } },
  ];
}

function planRecommendationChips(slug: ContractorPlanSlug): QuickReply[] {
  const plan = getContractorPlan(slug);
  return [
    { id: `qr-act-${slug}`, label: `Activer ${plan?.name ?? slug}`, action: { kind: "checkout_plan", planCode: slug } },
    { id: "qr-all-plans", label: "Voir tous les plans", action: { kind: "show_all_plans" } },
    { id: "qr-cont-fiche", label: "Continuer ma fiche", action: { kind: "send", text: "Je veux continuer ma fiche pour l'instant." } },
  ];
}

export function decideContractorNext(session: AlexSession, userText: string): EngineDecision {
  // Always merge any identity fragments the user just gave us.
  const newIdentity = extractContractorIdentity(userText);
  const merged = mergeIdentity(session.contractorIdentity, newIdentity);
  const hasIdentity = hasAnyIdentity(merged);

  const stage: ContractorStage = session.contractorStage ?? "intent_detected";

  // STAGE: intent_detected → opener
  if (stage === "intent_detected" && !hasIdentity) {
    return {
      alexText: CONTRACTOR_OPENER_FR,
      quickReplies: contractorIdentityChips(),
      nextBestAction: "ask",
      showMemoryLine: false,
      showProfilePrompt: false,
      sessionPatch: {
        mode: "contractor_onboarding",
        intent: "contractor",
        contractorStage: "intent_detected",
        contractorIdentity: merged,
      },
    };
  }

  // STAGE: identity collected → kick off enrichment
  if ((stage === "intent_detected" || stage === "identity_collected") && hasIdentity && !session.aippPreview) {
    return {
      alexText: CONTRACTOR_IDENTITY_ACK_FR,
      quickReplies: [],
      nextBestAction: "run_contractor_enrichment",
      showMemoryLine: true,
      showProfilePrompt: false,
      sessionPatch: {
        mode: "contractor_onboarding",
        intent: "contractor",
        contractorStage: "enrichment_running",
        contractorIdentity: merged,
      },
    };
  }

  // STAGE: aipp_scored → ask objective (only if we have a score and no objective yet)
  if (session.aippPreview && !session.objective) {
    return {
      alexText: `Votre score AIPP provisoire est de ${session.aippPreview.score}/100. Le plus gros potentiel est ${session.aippPreview.topGap}.

Votre objectif principal est quoi ?`,
      quickReplies: contractorObjectiveChips(),
      nextBestAction: "ask",
      showMemoryLine: false,
      showProfilePrompt: false,
      sessionPatch: {
        mode: "contractor_onboarding",
        intent: "contractor",
        contractorStage: "aipp_scored",
      },
    };
  }

  // STAGE: objective just collected → recommend plan
  if (session.aippPreview && (session.objective || userText.trim().length > 0)) {
    const objective = session.objective || userText;
    const planSlug = recommendPlanFromObjective(objective);
    const plan = getContractorPlan(planSlug)!;
    return {
      alexText: `Pour « ${objective} », je recommande le plan ${plan.name} à ${plan.monthlyPrice} $/mois.

${plan.description}

Voulez-vous activer votre fiche maintenant ?`,
      quickReplies: planRecommendationChips(planSlug),
      nextBestAction: "open_contractor_checkout",
      showMemoryLine: true,
      showProfilePrompt: false,
      sessionPatch: {
        mode: "contractor_onboarding",
        intent: "contractor",
        contractorStage: "plan_recommended",
        objective,
        recommendedPlan: planSlug,
      },
    };
  }

  // Fallback inside contractor mode
  return {
    alexText: CONTRACTOR_OPENER_FR,
    quickReplies: contractorIdentityChips(),
    nextBestAction: "ask",
    showMemoryLine: false,
    showProfilePrompt: false,
    sessionPatch: {
      mode: "contractor_onboarding",
      intent: "contractor",
      contractorStage: "intent_detected",
      contractorIdentity: merged,
    },
  };
}

/** Public helper: build the AIPP-scored decision once enrichment finishes. */
export function buildAippScoredDecision(session: AlexSession, preview: AippPreview): EngineDecision {
  return {
    alexText: `Votre score AIPP provisoire est de ${preview.score}/100. Le plus gros potentiel est ${preview.topGap}.

Votre objectif principal est quoi ?`,
    quickReplies: contractorObjectiveChips(),
    nextBestAction: "ask",
    showMemoryLine: false,
    showProfilePrompt: false,
    sessionPatch: {
      mode: "contractor_onboarding",
      intent: "contractor",
      contractorStage: "aipp_scored",
      aippPreview: preview,
    },
  };
}

/** Public helper: list-all-plans bubble. */
export function buildAllPlansDecision(): EngineDecision {
  const lines = CONTRACTOR_PLANS.map(
    (p) => `• ${p.name} — ${p.monthlyPrice} $/mois — ${p.subtitle}`,
  ).join("\n");
  return {
    alexText: `Voici les plans entrepreneur UNPRO :

${lines}

Quel plan vous parle le plus ?`,
    quickReplies: CONTRACTOR_PLANS.map((p) => ({
      id: `qr-pick-${p.slug}`,
      label: `Activer ${p.name}`,
      action: { kind: "checkout_plan", planCode: p.slug } as QuickReplyAction,
    })).slice(0, 4),
    nextBestAction: "open_contractor_checkout",
    showMemoryLine: false,
    showProfilePrompt: false,
    sessionPatch: { mode: "contractor_onboarding", intent: "contractor" },
  };
}

// ─── Main entry point ─────────────────────────────────────────────────

export function decideNext(session: AlexSession, userText: string): EngineDecision {
  // Detect contractor intent FIRST — sticky once entered, also re-detect every turn.
  const detectedContractor = detectContractorIntent(userText);
  const inContractorMode = session.mode === "contractor_onboarding" || detectedContractor;

  if (inContractorMode) {
    const decision = decideContractorNext(
      detectedContractor && session.mode !== "contractor_onboarding"
        ? { ...session, mode: "contractor_onboarding", intent: "contractor", contractorStage: "intent_detected" }
        : session,
      userText,
    );
    assertNoCallback(decision.alexText);
    return decision;
  }

  // ─── Homeowner branch (unchanged) ───
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

  if (intent === "paint") {
    if (nextSession.scope && nextSession.propertyType && nextSession.occupancyStatus) {
      const summary = paintingSummary(nextSession);
      assertNoCallback(summary.alexText);
      return { ...summary, sessionPatch: { ...summary.sessionPatch, intent, scope, propertyType, occupancyStatus } };
    }
    const nextQ = nextPaintingQuestion(nextSession);
    if (nextQ) {
      assertNoCallback(nextQ.alexText);
      return { ...nextQ, sessionPatch: { ...nextQ.sessionPatch, intent, scope, propertyType, occupancyStatus } };
    }
  }

  if (nextSession.answersCount >= 3) {
    const summary = genericSummary(nextSession);
    assertNoCallback(summary.alexText);
    return { ...summary, sessionPatch: { ...summary.sessionPatch, intent, scope, propertyType, occupancyStatus } };
  }

  const q = nextGenericQuestion(nextSession, userText);
  assertNoCallback(q.alexText);
  return { ...q, sessionPatch: { ...q.sessionPatch, intent, scope, propertyType, occupancyStatus } };
}

export const MEMORY_LINE_FR =
  "Je vais conserver ces informations dans votre dossier projet pour éviter de vous les redemander.";

export const PROFILE_PROMPT_FR =
  "Pour sauvegarder ce projet et éviter de recommencer, créez votre profil gratuit.";
