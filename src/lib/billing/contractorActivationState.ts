/**
 * Statut d'entente affiché à l'entrepreneur. Seul `activation_status`, écrit
 * côté serveur par le webhook de paiement ou la réclamation d'offre gratuite
 * admissible, fait foi. `account_status = 'active'` est la valeur par défaut
 * d'une fiche et ne prouve ni paiement ni activation.
 */
const ACTIVATED = new Set(["activated", "active"]);

export function isContractorAgreementActive(profile: {
  activation_status?: string | null;
} | null | undefined): boolean {
  return ACTIVATED.has(String(profile?.activation_status ?? ""));
}
