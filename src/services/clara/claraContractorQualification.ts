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
 * La persistance passe par la conversation canonique (`clara-session`,
 * champ `workflow.contractor_qualification`) avec un miroir local qui permet le
 * préremplissage immédiat après un changement d'écran ou un rafraîchissement.
 */
import { rememberClaraReferences } from "@/services/clara/claraSession";

export type ClaraQualificationField = "primary_trade" | "business_city" | "service_areas" | "goals" | "business_name";

export interface ClaraContractorQualification {
  /** Métier principal déclaré par l'entrepreneur. */
  primary_trade?: string | null;
  /** Ville où l'entreprise est établie (siège) — jamais un territoire. */
  business_city?: string | null;
  /** Villes ou régions réellement desservies. */
  service_areas?: string[];
  /** Nom de l'entreprise ou site Web déclaré. */
  business_name?: string | null;
  /** Objectifs déclarés (plusieurs possibles). */
  goals?: string[];
  /** Provenance : tout ce qui vient de la conversation est « déclaré ». */
  provenance?: Record<string, "declared">;
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
export function saveClaraQualification(patch: ClaraContractorQualification): ClaraContractorQualification {
  const current = read();
  const next: ClaraContractorQualification = { ...current };
  if (patch.primary_trade) next.primary_trade = patch.primary_trade;
  if (patch.business_city) next.business_city = patch.business_city;
  if (patch.business_name) next.business_name = patch.business_name;
  if (patch.service_areas?.length) {
    next.service_areas = Array.from(new Set([...(current.service_areas ?? []), ...patch.service_areas]));
  }
  if (patch.goals?.length) {
    next.goals = Array.from(new Set([...(current.goals ?? []), ...patch.goals]));
  }
  next.provenance = {
    ...(current.provenance ?? {}),
    ...Object.fromEntries(
      (["primary_trade", "business_city", "service_areas", "goals", "business_name"] as ClaraQualificationField[])
        .filter((k) => (patch as Record<string, unknown>)[k])
        .map((k) => [k, "declared" as const]),
    ),
  };
  next.updated_at = new Date().toISOString();
  write(next);
  // Continuité canonique : la conversation garde l'avancement, jamais une copie métier.
  rememberClaraReferences({ workflow: { contractor_qualification: next } });
  return next;
}

/** Hydrate la qualification à partir de la session canonique (retour, second appareil). */
export function hydrateClaraQualification(workflow: Record<string, unknown> | null | undefined): void {
  const remote = (workflow?.contractor_qualification ?? null) as ClaraContractorQualification | null;
  if (!remote) return;
  const current = read();
  if ((current.updated_at ?? "") >= (remote.updated_at ?? "")) return;
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
    field: "service_areas",
    question: "Dans quelle(s) ville(s) travaillez-vous surtout ?",
    multi: true,
  },
  {
    field: "goals",
    question:
      "Votre priorité en ce moment, c’est plutôt obtenir plus de contrats, éviter les soumissions inutiles, améliorer votre visibilité IA, ou autre chose ?",
    quickReplies: [
      "Plus de contrats",
      "Éviter les soumissions inutiles",
      "Visibilité IA",
      "Autre",
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
