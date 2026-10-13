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

/** État réel de l'entrepreneur, déduit du compte (jamais d'une phrase). */
export type ContractorJourneyState = "visitor" | "started" | "registered" | "activated";
export type ContractorSuggestion =
  | { label: string; choice: "score" | "contracts" | "profile" }
  | { label: string; route: string };

const LABELS = {
  fr: { score: "Voir mon score IA", visibility: "Vérifier ma visibilité IA", register: "M'inscrire comme entrepreneur", resume: "Poursuivre mon inscription", profile: "Consulter mon profil", rdv: "Mes rendez-vous qualifiés", dash: "Mon tableau de bord", manage: "Gérer mon profil" },
  en: { score: "View my AI score", visibility: "Check my AI visibility", register: "Register as a contractor", resume: "Continue my registration", profile: "View my profile", rdv: "My qualified appointments", dash: "My dashboard", manage: "Manage my profile" },
} as const;

/** 2-3 actions réelles par état, jamais une action propriétaire ni une réinscription après activation. */
export function contractorSuggestionsFor(state: ContractorJourneyState, lang: "fr" | "en" = "fr"): ContractorSuggestion[] {
  const l = LABELS[lang];
  switch (state) {
    case "visitor":
      return [{ label: l.score, choice: "score" }, { label: l.visibility, choice: "contracts" }, { label: l.register, choice: "profile" }];
    case "started":
      return [{ label: l.resume, route: "/entrepreneur/devis-personnalise" }, { label: l.score, choice: "score" }];
    case "registered":
      return [{ label: l.profile, route: "/pro" }, { label: l.rdv, route: "/pro" }, { label: l.dash, route: "/pro" }];
    case "activated":
      return [{ label: l.manage, route: "/pro" }, { label: l.rdv, route: "/pro" }];
  }
}
