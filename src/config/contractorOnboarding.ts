/**
 * UNPRO — CONTRACTOR ONBOARDING CONFIG (single source of truth)
 *
 * Defines the autonomous, no-restart contractor onboarding contract.
 * Used by `PanelContractorAdvisorAlex` and any voice/chat surface that
 * needs to know "should I resume or restart?".
 *
 * GOLDEN RULES:
 *   - If a contractor profile exists → ALWAYS resume, never restart.
 *   - Single input field accepts: website, RBQ, NEQ, phone, business name.
 *   - No long questionnaire. Objectives are chips, not forms.
 *   - Plan recommendations come from CONTRACTOR_PLANS only.
 */

import type { ContractorPlanSlug } from "./pricing";

export type ContractorOnboardingInputKind =
  | "website"
  | "rbq"
  | "neq"
  | "phone"
  | "business_name";

export interface ContractorInputField {
  kind: ContractorOnboardingInputKind;
  label: string;
  placeholder: string;
  hint: string;
}

/** The 5 input kinds the unified AIPP intake accepts. */
export const CONTRACTOR_INPUT_FIELDS: readonly ContractorInputField[] = Object.freeze([
  { kind: "website",       label: "Site web",     placeholder: "https://votreentreprise.ca", hint: "URL ou domaine" },
  { kind: "rbq",           label: "RBQ",          placeholder: "5732-1234-01",                hint: "Licence RBQ Québec" },
  { kind: "neq",           label: "NEQ",          placeholder: "1234567890",                  hint: "Numéro entreprise du Québec" },
  { kind: "phone",         label: "Téléphone",    placeholder: "514 555 1234",                hint: "Téléphone d'affaires" },
  { kind: "business_name", label: "Nom",          placeholder: "Toiture Tremblay inc.",       hint: "Raison sociale" },
]);

export type ContractorObjective =
  | "more_calls"
  | "more_quotes"
  | "fill_schedule"
  | "premium_jobs"
  | "dominate_city";

export interface ContractorObjectiveChip {
  key: ContractorObjective;
  label: string;
  recommendedPlan: ContractorPlanSlug;
}

/** Objective chips — one tap maps directly to a plan recommendation. */
export const CONTRACTOR_OBJECTIVES: readonly ContractorObjectiveChip[] = Object.freeze([
  { key: "more_calls",     label: "Plus d'appels",       recommendedPlan: "pro" },
  { key: "more_quotes",    label: "Plus de soumissions", recommendedPlan: "premium" },
  { key: "fill_schedule",  label: "Remplir mon agenda",  recommendedPlan: "premium" },
  { key: "premium_jobs",   label: "Jobs rentables",      recommendedPlan: "elite" },
  { key: "dominate_city",  label: "Dominer ma ville",    recommendedPlan: "signature" },
]);

/**
 * Detect input kind from a free-text value (heuristic, not strict).
 * Used to route the unified field into the right enrichment call.
 */
export function detectInputKind(value: string): ContractorOnboardingInputKind {
  const v = value.trim();
  if (/https?:\/\/|www\.|\.[a-z]{2,}\b/i.test(v)) return "website";
  if (/^\d{4}-\d{4}-\d{2}$/.test(v))               return "rbq";
  if (/^\d{10}$/.test(v))                          return "neq"; // ambiguous w/ phone, NEQ wins (10 digits, no separators)
  if (/^\+?\d[\d\s\-().]{6,}$/.test(v))            return "phone";
  return "business_name";
}

/**
 * Decide whether onboarding should RESUME (contractor known) or START.
 * Surfaces must use this — never their own ad-hoc check.
 */
export function shouldResumeOnboarding(args: {
  hasContractorProfile: boolean;
  hasAippScore: boolean;
}): boolean {
  return args.hasContractorProfile;
}
