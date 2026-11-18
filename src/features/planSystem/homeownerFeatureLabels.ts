/**
 * UNPRO — Libellés humains des avantages propriétaires (/upgrade).
 * Lit les droits tels quels (plan_features) : n'invente ni ne modifie aucun quota.
 * - Les clés *_daily sont un garde-fou anti-abus invisible (voir usagePolicy) : jamais affichées.
 * - Une clé inconnue n'est jamais affichée brute : elle est masquée.
 */

const HIDDEN_KEYS = new Set(["ai_design_daily", "quote_analysis_daily"]);

const BOOLEAN_LABELS: Record<string, string> = {
  quote_comparison: "Comparaison de vos soumissions",
  contractor_verification_detailed: "Vérification détaillée des entrepreneurs",
  maintenance_reminders: "Rappels d'entretien",
  document_archive_advanced: "Archivage avancé des documents",
  project_history: "Historique des projets et des dépenses",
  alex_priority: "Accompagnement Clara avancé",
  work_prioritization: "Priorisation des travaux",
  proactive_suggestions: "Suggestions proactives",
  priority_support: "Soutien prioritaire",
};

/** Libellé d'une ligne de carte, ou null si la ligne ne doit pas être affichée. */
export function homeownerFeatureLine(key: string, limit: number | null): string | null {
  if (HIDDEN_KEYS.has(key)) return null;
  const n = typeof limit === "number" ? limit : null;
  const unlimited = n === -1;
  switch (key) {
    case "properties_max":
      if (unlimited) return "Propriétés illimitées";
      if (n === null || n < 1) return null;
      return n === 1 ? "1 propriété incluse" : `Jusqu'à ${n} propriétés`;
    case "property_passport":
      if (unlimited) return "Passeport Maison pour toutes vos propriétés";
      if (n === null || n < 1) return "Passeport Maison";
      return n === 1 ? "Passeport Maison (1 propriété)" : `Passeport Maison pour ${n} propriétés`;
    case "quote_analysis_monthly":
      if (unlimited) return "Analyses de soumissions illimitées";
      if (n === null || n < 1) return null;
      return n === 1 ? "1 analyse de soumission par mois" : `${n} analyses de soumissions par mois`;
    case "ai_design_monthly":
      if (unlimited) return "Designs IA illimités";
      if (n === null || n < 1) return null;
      return n === 1 ? "1 design IA par mois" : `${n} designs IA par mois`;
    default:
      return BOOLEAN_LABELS[key] ?? null;
  }
}

/** Vrai si la ligne affichée promet un usage illimité (politique d'utilisation raisonnable). */
export function isUnlimitedLine(key: string, limit: number | null): boolean {
  return limit === -1 && homeownerFeatureLine(key, limit) !== null;
}

/** Libellé du blocage (?feature=…) : « X nécessite un plan supérieur ». */
export const HOMEOWNER_WALL_LABELS: Record<string, string> = {
  properties_max: "Ajouter une propriété",
  property_passport: "Ajouter un Passeport Maison",
  quote_analysis_monthly: "Analyser plus de soumissions",
  ai_design_monthly: "Créer plus de designs IA",
  ...BOOLEAN_LABELS,
};
