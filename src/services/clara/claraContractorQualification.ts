/**
 * UNPRO — Qualification entrepreneur menée par Clara AVANT l'ouverture de l'audit.
 *
 * Règles produit :
 *  - une seule question par tour, maximum 5 questions;
 *  - jamais une question dont la réponse est déjà connue;
 *  - chaque réponse est enregistrée immédiatement (déclarée par l'entrepreneur);
 *  - la ville de l'entreprise (siège) et les territoires desservis sont deux
 *    informations distinctes, jamais fusionnées;
 *  - aucune donnée n'est inventée : ce qui n'est pas dit reste vide.
 *
 * La persistance passe par le profil de jumelage existant (`matching-profile`) avec un miroir local qui permet le
 * préremplissage immédiat après un changement d'écran ou un rafraîchissement.
 */
import { persistClaraQualification, loadClaraQualification } from "./claraQualificationPersistence";
import { RBQ_DECLARATION_OPTIONS, type RbqDeclaration } from "@/lib/compliance/rbqDeclaration";

/** Immediate local mirror, debounced canonical matching-profile persistence. */
let pendingQualification: ClaraContractorQualification | null = null;
let syncTimer: ReturnType<typeof setTimeout> | null = null;
let syncQueue: Promise<void> = Promise.resolve();
let syncError: Error | null = null;
function scheduleQualification(value: ClaraContractorQualification) {
  pendingQualification = value;
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => { void flushClaraQualification().catch(() => {}); }, 400);
}
export async function flushClaraQualification(): Promise<void> {
  if (syncTimer) { clearTimeout(syncTimer); syncTimer = null; }
  const value = pendingQualification;
  pendingQualification = null;
  if (value) {
    syncQueue = syncQueue.then(async () => {
      try { await persistClaraQualification(value); syncError = null; }
      catch (error) { syncError = error instanceof Error ? error : new Error("Sauvegarde indisponible."); }
    });
  }
  await syncQueue;
  if (syncError) throw syncError;
}
export async function resumeClaraQualification(): Promise<void> {
  const snapshot = read();
  const remote = await loadClaraQualification();
  if (!remote || read().updated_at !== snapshot.updated_at) return;
  // Server ownership is authoritative; keep only genuinely unsaved local edits.
  if (pendingQualification || syncError) return;
  write(remote);
}

export type ClaraProvenance = "public" | "declared" | "inferred";

export type ClaraQualificationField =
  | "primary_trade"
  | "customer_type"
  | "business_city"
  | "service_areas"
  | "goals"
  | "business_name";

export interface ClaraContractorQualification {
  /** Métier principal déclaré par l'entrepreneur. */
  primary_trade?: string | null;
  /** Clientèle desservie (résidentiel, commercial, les deux) — jamais un rôle. */
  customer_type?: string | null;
  /** Ville où l'entreprise est établie (siège) — jamais un territoire. */
  business_city?: string | null;
  /** Villes ou régions réellement desservies. */
  service_areas?: string[];
  /** Nom de l'entreprise ou site Web déclaré. */
  business_name?: string | null;
  /** Objectifs déclarés (plusieurs possibles). */
  goals?: string[];
  /** Site Web et téléphone publics (fiche Google) ou déclarés. */
  website?: string | null;
  phone?: string | null;
  /** Identifiant de la fiche Google confirmée par l'entrepreneur. */
  google_place_id?: string | null;
  /** Situation RBQ DÉCLARÉE (jamais vérifiée ici) — mêmes 6 statuts que « Mon profil ». */
  rbq_declaration?: RbqDeclaration | null;
  /**
   * Provenance par champ : « public » = fiche Google confirmée,
   * « declared » = dit par l'entrepreneur, « inferred » = déduit par UNPRO.
   */
  provenance?: Record<string, ClaraProvenance>;
  /** Critères courts déclarés, jamais la transcription complète. */
  preferred_work?: string[];
  excluded_areas?: string[];
  excluded_work?: string[];
  preferred_project_sizes?: string[];
  preferred_duration?: string | null;
  availability?: string | null;
  preferences_captured?: boolean;
  preferences_confirmed?: boolean;
  updated_at?: string;
}

const STORAGE_KEY = "unpro_clara_contractor_qualification";

export const CLARA_QUALIFICATION_UPDATED_EVENT = "clara-contractor-qualification-updated";

function read(): ClaraContractorQualification {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ClaraContractorQualification) : {};
  } catch {
    return {};
  }
}

function write(value: ClaraContractorQualification) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    /* stockage indisponible : la reprise serveur prend le relais */
  }
  window.dispatchEvent(new CustomEvent(CLARA_QUALIFICATION_UPDATED_EVENT, { detail: value }));
}

export function getClaraQualification(): ClaraContractorQualification {
  return read();
}

/** Enregistre une réponse réelle, sans jamais écraser une valeur par du vide. */
export function saveClaraQualification(
  patch: ClaraContractorQualification,
  source: ClaraProvenance | Partial<Record<string, ClaraProvenance>> = "declared",
  options: { replaceLists?: boolean } = {},
): ClaraContractorQualification {
  const current = read();
  const next: ClaraContractorQualification = { ...current };
  if (patch.primary_trade) next.primary_trade = patch.primary_trade;
  if (patch.customer_type) next.customer_type = patch.customer_type;
  if (options.replaceLists) {
    if (patch.primary_trade !== undefined) next.primary_trade = patch.primary_trade;
    if (patch.customer_type !== undefined) next.customer_type = patch.customer_type;
    if (patch.business_city !== undefined) next.business_city = patch.business_city;
  }
  if (patch.business_city) next.business_city = patch.business_city;
  if (patch.business_name) next.business_name = patch.business_name;
  if (patch.website) next.website = patch.website;
  if (patch.phone) next.phone = patch.phone;
  if (patch.google_place_id) next.google_place_id = patch.google_place_id;
  if (patch.rbq_declaration) next.rbq_declaration = patch.rbq_declaration;
  for (const key of ["preferred_work", "excluded_work", "excluded_areas", "preferred_project_sizes"] as const) {
    if (patch[key] !== undefined) next[key] = [...new Set(patch[key])];
  }
  for (const key of ["preferred_duration", "availability"] as const) {
    if (patch[key] !== undefined) next[key] = patch[key];
  }
  if (patch.preferences_captured !== undefined) next.preferences_captured = patch.preferences_captured;
  if (patch.preferences_confirmed !== undefined) next.preferences_confirmed = patch.preferences_confirmed;
  if (options.replaceLists && patch.service_areas !== undefined) next.service_areas = [...new Set(patch.service_areas)];
  else if (patch.service_areas?.length) {
    next.service_areas = Array.from(new Set([...(current.service_areas ?? []), ...patch.service_areas]));
  }
  if (options.replaceLists && patch.goals !== undefined) next.goals = [...new Set(patch.goals)];
  else if (patch.goals?.length) {
    next.goals = Array.from(new Set([...(current.goals ?? []), ...patch.goals]));
  }
  next.provenance = {
    ...(current.provenance ?? {}),
    ...Object.fromEntries(
      ["primary_trade", "customer_type", "business_city", "service_areas", "goals", "business_name", "website", "phone", "google_place_id", "rbq_declaration", "preferred_work", "excluded_work", "excluded_areas", "preferred_project_sizes", "preferred_duration", "availability"]
        .filter((k) => (patch as Record<string, unknown>)[k] !== undefined)
        .map((k) => [k, typeof source === "string" ? source : source[k] ?? "declared"]),
    ),
  };
  next.updated_at = new Date().toISOString();
  write(next);
  // Continuité canonique : la conversation garde l'avancement, jamais une copie métier.
  scheduleQualification(next);
  return next;
}

/** Hydrate la qualification à partir de la session canonique (retour, second appareil). */
export function hydrateClaraQualification(workflow: Record<string, unknown> | null | undefined, options: { ownerValidated?: boolean } = {}): void {
  const remote = (workflow?.contractor_qualification ?? null) as ClaraContractorQualification | null;
  if (!remote) return;
  const current = read();
  if (options.ownerValidated && (pendingQualification || syncError)) return;
  if (!options.ownerValidated && (current.updated_at ?? "") >= (remote.updated_at ?? "")) return;
  write(remote);
}

export interface ClaraQualificationStep {
  field: ClaraQualificationField;
  /** Question posée par Clara — une seule par tour. */
  question: string;
  /** Réponses rapides proposées (jamais obligatoires). */
  quickReplies?: string[];
  multi?: boolean;
}

/** Phrase d'ouverture : Clara reformule le besoin avant de questionner. */
export const CLARA_CONTRACTOR_OPENING =
  "Je vois — vous aimeriez obtenir de meilleurs contrats sans perdre de temps en soumissions inutiles.";

/** Phrase de transition, dite seulement une fois la qualification terminée. */
export const CLARA_CONTRACTOR_ANALYSIS_NOTE =
  "Parfait. J’ai ce qu’il me faut pour commencer. Je vais vérifier ce qu’UNPRO comprend déjà de votre entreprise.";

const ALL_STEPS: ClaraQualificationStep[] = [
  { field: "primary_trade", question: "Parfait. Quel est votre métier principal ?" },
  {
    field: "customer_type",
    question: "Travaillez-vous surtout au résidentiel, au commercial, ou les deux ?",
    quickReplies: ["Résidentiel", "Commercial", "Les deux"],
  },
  {
    field: "service_areas",
    question: "Dans quelle(s) ville(s) travaillez-vous surtout ?",
    multi: true,
  },
  {
    field: "goals",
    question: "Qu’aimeriez-vous améliorer pour votre entreprise ?",
    quickReplies: [
      "Être plus visible sur Google et les moteurs d’IA",
      "Obtenir plus de contrats",
      "Recevoir des demandes mieux adaptées à mes services",
      "Réduire le temps consacré à trouver des clients",
    ],
  },
  { field: "business_name", question: "Quel est le nom de votre entreprise ou votre site Web ?" },
];

/** Prochaine question réellement utile, ou `null` quand tout est connu. */
export function nextQualificationStep(
  known: ClaraContractorQualification = read(),
): ClaraQualificationStep | null {
  for (const step of ALL_STEPS) {
    const value = known[step.field];
    const empty = Array.isArray(value) ? value.length === 0 : !value;
    if (empty) return step;
  }
  return null;
}

/** Nombre maximal de questions posées par Clara avant l'audit. */
export const MAX_QUALIFICATION_QUESTIONS = ALL_STEPS.length;

/** Une adresse précise n'est jamais une déclaration de territoire. */
export function isAddressAnswer(answer: string): boolean {
  return /\b(adresse|ma propriété|mon domicile|à confirmer|place_id)\b/i.test(answer)
    || /(?:^|\s)\d{1,6}\s+(?:\d+e?\s+)?(?:[\p{L}'’-]+\s+){0,3}(?:rue|avenue|ave\b|av\.|boulevard|boul\b|chemin|rang|street|road)/iu.test(answer);
}

export const CLARA_ADDRESS_CLARIFICATION =
  "Cette adresse concerne-t-elle votre entreprise ou votre propriété personnelle? Elle ne détermine pas vos villes desservies.";

export function isQualificationComplete(known: ClaraContractorQualification = read()): boolean {
  return nextQualificationStep(known) === null;
}

/** Réponse libre convertie en valeur exploitable pour l'étape en cours. */
export function applyAnswer(
  step: ClaraQualificationStep,
  answer: string,
): ClaraContractorQualification {
  const clean = answer.trim();
  if (!clean) return read();
  if (step.field === "service_areas" && isAddressAnswer(clean)) return read();
  if (step.multi) {
    const list = clean
      .split(/[,;/]|\bet\b/i)
      .map((v) => v.trim())
      .filter(Boolean)
      .slice(0, 8);
    return saveClaraQualification({ [step.field]: list } as ClaraContractorQualification);
  }
  if (step.field === "goals") return saveClaraQualification({ goals: [clean.slice(0, 80)] });
  return saveClaraQualification({ [step.field]: clean.slice(0, 120) } as ClaraContractorQualification);
}

/** Confirmation plutôt que question quand UNPRO connaît déjà l'entreprise. */
export function buildKnownBusinessConfirmation(input: {
  businessName?: string | null;
  trade?: string | null;
  businessCity?: string | null;
}): string | null {
  if (!input.businessName) return null;
  const parts = [`J'ai trouvé ${input.businessName}`];
  if (input.trade) parts.push(`en ${input.trade.toLowerCase()}`);
  if (input.businessCity) parts.push(`établie à ${input.businessCity}`);
  return `${parts.join(", ")}. C'est bien ça ?`;
}


/* ─────────────── Rôle de la conversation (entrepreneur vs propriétaire) ─────────────── */

const CONTRACTOR_USER_TEXT =
  /\b(inscri\w*\s+(?:mon|notre|ma)\s+(?:entreprise|compagnie|business)|mon\s+entreprise|notre\s+entreprise|ma\s+compagnie|je\s+suis\s+(?:un\s+|une\s+)?entrepreneur|je\s+suis\s+(?:un\s+|une\s+)?pro\b|mes\s+clients|ma\s+licence\s+rbq|plus\s+de\s+contrats)/i;

/** Questions de Clara qui ne concernent QUE l'entreprise. */
const CONTRACTOR_ASSISTANT_QUESTION =
  /(de\s+(?:cette|votre|l['’])\s*entreprise|inscription\s+de\s+votre\s+entreprise|licence\s+rbq|num[ée]ro\s+rbq|m[ée]tier\s+principal|villes?\s+desservies|travaillez-vous)/i;

/**
 * Vrai quand ce tour appartient au parcours entrepreneur : soit l'utilisateur
 * parle de son entreprise, soit il répond à une question de Clara portant sur
 * l'entreprise (« propriétaire » = propriétaire de l'ENTREPRISE dans ce cas).
 * Une demande explicite de projet maison n'est jamais reclassée.
 */
export function isContractorConversationTurn(userText: string, lastAssistantText?: string | null): boolean {
  const text = (userText ?? "").trim();
  if (!text) return false;
  if (CONTRACTOR_USER_TEXT.test(text)) return true;
  if (/\b(ma\s+maison|mon\s+condo|chez\s+moi|mon\s+toit|ma\s+propri[ée]t[ée])\b/i.test(text) && !CONTRACTOR_ASSISTANT_QUESTION.test(lastAssistantText ?? "")) return false;
  return CONTRACTOR_ASSISTANT_QUESTION.test(lastAssistantText ?? "");
}

/** Les 6 situations RBQ existantes (« Mon profil »), proposées comme réponses rapides. */
export const CLARA_RBQ_QUICK_REPLIES = RBQ_DECLARATION_OPTIONS.map((o) => o.label);

export const CLARA_RBQ_QUESTION =
  "D'accord. Laquelle de ces situations décrit le mieux votre entreprise ? Vous pourrez continuer dans tous les cas; seuls les travaux réglementés exigent une licence RBQ valide.";

/** Une question/annonce de Clara qui porte sur la licence RBQ. */
export function mentionsRbq(text: string): boolean {
  return /\b(rbq|licence)\b/i.test(text ?? "");
}

/**
 * Convertit un choix rapide ou une réponse naturelle vers un statut existant.
 * `null` = réponse ambiguë (ex. « Je n'ai pas de licence ») : Clara propose
 * alors les 6 choix, sans jamais conclure à une licence suspendue.
 */
export function mapRbqAnswer(answer: string): RbqDeclaration | null {
  const t = (answer ?? "").trim();
  const exact = RBQ_DECLARATION_OPTIONS.find((o) => o.label.toLowerCase() === t.toLowerCase());
  if (exact) return exact.value;
  if (/ne\s+requiert\s+pas|pas\s+(?:besoin|requis|n[ée]cessaire)|exempt/i.test(t)) return "not_required";
  if (/en\s+cours|j['’]attends|demande\s+(?:faite|envoy)/i.test(t)) return "in_progress";
  if (/travaille\s+pour|employ[ée]|salari[ée]/i.test(t)) return "employer_licensed";
  if (/je\s+ne\s+sais\s+pas|incertain|pas\s+s[ûu]r/i.test(t)) return "unsure";
  if (/^(oui|j['’]ai\s+(?:une|ma)\s+licence)/i.test(t) || /\b\d{4}-\d{4}-\d{2}\b/.test(t)) return "has_license";
  return null;
}

/** Réponse qui parle de licence sans désigner une situation précise. */
export function isAmbiguousRbqAnswer(answer: string): boolean {
  return mentionsRbq(answer) || /^(non|pas en main|aucune)\b/i.test((answer ?? "").trim());
}
