/**
 * Clara — garde de rôle (source de vérité unique des actions permises par parcours).
 * Une action d'un autre parcours est refusée à la source : elle ne rend rien.
 */
export type ClaraRole = "homeowner" | "contractor" | "affiliate" | "unknown";

export type ClaraAction =
  | "open_dossier_maison"
  | "edit_property_address"
  | "resume_home_project"
  | "verify_homeowner_quote"
  | "contractor_onboarding"
  | "contractor_activation_350"
  | "affiliate_onboarding";

const ALLOWED: Record<ClaraRole, ReadonlySet<ClaraAction>> = {
  homeowner: new Set(["open_dossier_maison", "edit_property_address", "resume_home_project", "verify_homeowner_quote"]),
  contractor: new Set(["contractor_onboarding", "contractor_activation_350"]),
  affiliate: new Set(["affiliate_onboarding"]),
  unknown: new Set(),
};

export function canRunClaraAction(role: ClaraRole | null | undefined, action: ClaraAction): boolean {
  return ALLOWED[role ?? "unknown"].has(action);
}

/** Suggestions propres au parcours propriétaire : jamais montrées ailleurs. */
const HOMEOWNER_SUGGESTION = /projet maison|dossier maison|ma propri[ée]t[ée]|adresse de (la|ma|votre) propri[ée]t[ée]|choisir (mon|l'|l’)adresse|v[ée]rifier (ma|une|mes) soumission|comparer (mes|des) soumissions/i;

export function filterSuggestionsForRole(role: ClaraRole, options: readonly string[]): string[] {
  if (role === "homeowner") return [...options];
  return options.filter((option) => !HOMEOWNER_SUGGESTION.test(option));
}

export const ROLE_DISAMBIGUATION_QUESTION = "Vous êtes propriétaire, entrepreneur ou affilié ?";
