/**
 * Portes dures et normalisations pures du jumelage canonique.
 * Fichier sans dépendance réseau : testable directement côté application.
 */
export function normCity(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .toString()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

/**
 * Les sous-catégories d'interface du calculateur ne sont pas des catégories
 * de service canoniques. Elles se rattachent toutes à `renovation-generale`
 * pour l'admissibilité, la sélection d'interface restant conservée telle
 * quelle dans le projet, la demande et l'administration.
 */
const UI_SUBCATEGORY_TO_CANONICAL: Record<string, string> = {
  cuisine: "renovation-generale",
  salle_de_bain: "renovation-generale",
  sous_sol: "renovation-generale",
  garage: "renovation-generale",
  aire_de_vie: "renovation-generale",
  renovation_complete: "renovation-generale",
};

export function canonicalCategorySlug(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const key = String(raw).trim();
  if (!key) return null;
  return UI_SUBCATEGORY_TO_CANONICAL[key] ?? key;
}

/** Licences explicitement invalides : exclusion dure. */
export const BAD_LICENCE_STATES = new Set([
  "expired",
  "suspended",
  "revoked",
  "not_found",
  "unverified",
  "rejected",
  "invalid",
]);

/** Réponses qui invalident définitivement un jumelage existant. */
export const REFUSED_RESPONSE_STATES = new Set([
  "declined",
  "rejected",
  "expired",
  "cancelled",
  "canceled",
]);

/** Territoire : seule une zone de service explicite qualifie l'entrepreneur. */
export function servesCityGate(
  areaCities: Iterable<string>,
  leadCity: string | null | undefined,
): boolean {
  const target = normCity(leadCity);
  if (!target) return false;
  for (const c of areaCities) {
    if (normCity(c) === target) return true;
  }
  return false;
}

export function rbqGatePasses(c: {
  rbq_number?: string | null;
  rbq_compliance_status?: string | null;
  rbq_verified_at?: string | null;
  rbq_expiry_date?: string | null;
}, now = Date.now()): boolean {
  if (!c.rbq_number || String(c.rbq_number).trim() === "") return false;
  if (c.rbq_compliance_status !== "verified") return false;
  if (!c.rbq_verified_at) return false;
  if (c.rbq_expiry_date && new Date(c.rbq_expiry_date).getTime() <= now) return false;
  return true;
}

/**
 * Propagation stricte des erreurs Supabase : aucune requête critique ne peut
 * dégénérer silencieusement en résultat vide. Retourne les données lorsque la
 * requête a réussi, lève une erreur descriptive sinon.
 */
export function assertQueryOk<T>(
  label: string,
  res: { data?: T | null; error?: { message?: string } | null } | null | undefined,
): T | null {
  if (!res) throw new Error(`${label}_failed: no_response`);
  if (res.error) throw new Error(`${label}_failed: ${res.error.message ?? "unknown_error"}`);
  return (res.data ?? null) as T | null;
}
