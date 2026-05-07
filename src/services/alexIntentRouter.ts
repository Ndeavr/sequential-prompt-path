/**
 * Alex Intent Router
 * Central mapping of high-level user intents → Alex preset message + optional route.
 * Used by HeroSectionAlexFirst chips, AlexCompanionOrb, deep-link triggers, voice handoffs.
 *
 * Keep this PURE and side-effect free — UI surfaces decide whether to navigate or
 * just open Alex with the preset.
 */

export type AlexIntentId =
  | "project_estimate"
  | "verify_contractor"
  | "quote_compare"
  | "urgent_problem"
  | "upload_photo"
  | "unsure"
  | "talk_to_alex";

export interface AlexIntent {
  id: AlexIntentId;
  label: string;
  preset: string;
  /** Optional route to navigate to (in addition to opening Alex). */
  route?: string;
  /** Optional analytics tag. */
  analyticsTag?: string;
}

const REGISTRY: Record<AlexIntentId, AlexIntent> = {
  project_estimate: {
    id: "project_estimate",
    label: "Estimer un projet",
    preset: "J'aimerais estimer un projet.",
    analyticsTag: "intent_project_estimate",
  },
  verify_contractor: {
    id: "verify_contractor",
    label: "Vérifier un entrepreneur",
    preset: "Je veux vérifier un entrepreneur.",
    analyticsTag: "intent_verify_contractor",
  },
  quote_compare: {
    id: "quote_compare",
    label: "Comparer 3 soumissions",
    preset: "J'ai des soumissions à comparer.",
    analyticsTag: "intent_quote_compare",
  },
  urgent_problem: {
    id: "urgent_problem",
    label: "Problème urgent",
    preset: "J'ai un problème urgent à la maison.",
    analyticsTag: "intent_urgent_problem",
  },
  upload_photo: {
    id: "upload_photo",
    label: "Téléverser une photo",
    preset: "",
    analyticsTag: "intent_upload_photo",
  },
  unsure: {
    id: "unsure",
    label: "Je ne sais pas",
    preset: "Je ne sais pas par où commencer.",
    analyticsTag: "intent_unsure",
  },
  talk_to_alex: {
    id: "talk_to_alex",
    label: "Parler à Alex",
    preset: "",
    analyticsTag: "intent_talk_to_alex",
  },
};

export function getIntent(id: AlexIntentId): AlexIntent {
  return REGISTRY[id];
}

export function listIntents(ids: AlexIntentId[]): AlexIntent[] {
  return ids.map(getIntent);
}

/** Default chip set used by the homepage hero. */
export const HERO_CHIP_INTENTS: AlexIntentId[] = [
  "project_estimate",
  "verify_contractor",
  "quote_compare",
  "urgent_problem",
  "upload_photo",
  "unsure",
];
