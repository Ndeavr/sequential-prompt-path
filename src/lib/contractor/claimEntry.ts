/**
 * UNPRO — entrée « fiche préremplie → réclamation » (logique pure, testable).
 *
 * Règles :
 *  - le slug n'est jamais une preuve de propriété ni une source de nom :
 *    aucun nom n'est déduit de l'URL ;
 *  - un jeton opaque (?t=) est remis tel quel au parcours canonique
 *    /unpro/activate/:token (résolution exacte, réclamation authentifiée,
 *    code de vérification, puis checkout canonique 350 $ + taxes) ;
 *  - sans jeton, seule une fiche déjà publiquement lisible est affichée ;
 *    sinon : 404 honnête ;
 *  - le statut affiché après paiement vient uniquement du serveur.
 */

/** Activer seulement après application approuvée de supabase/staged/claim-slug-entry. */
export const PROSPECT_SLUG_PREVIEW_ENABLED = false;

const TOKEN_RE = /^[A-Za-z0-9_-]{16,128}$/;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isOpaqueToken(value: string | null | undefined): value is string {
  return typeof value === "string" && TOKEN_RE.test(value);
}

export function isValidSlug(value: string | null | undefined): value is string {
  return typeof value === "string" && value.length <= 120 && SLUG_RE.test(value);
}

/** Paramètres d'attribution conservés (jamais de PII, jamais le jeton). */
const ATTRIBUTION_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "ref"] as const;

export function attributionQuery(search: URLSearchParams): string {
  const out = new URLSearchParams();
  for (const key of ATTRIBUTION_KEYS) {
    const v = search.get(key);
    if (v && /^[A-Za-z0-9_.-]{1,80}$/.test(v)) out.set(key, v);
  }
  return out.toString();
}

export function canonicalTokenPath(token: string, search: URLSearchParams): string {
  const q = attributionQuery(search);
  return `/unpro/activate/${encodeURIComponent(token)}${q ? `?${q}` : ""}`;
}

export interface PublicContractorRow {
  id: string;
  user_id?: string | null;
  business_name: string | null;
  city: string | null;
  specialty: string | null;
  public_status: string | null;
}

export type ClaimEntry =
  | { kind: "redirect_token"; path: string }
  | { kind: "not_found" }
  | { kind: "own_profile"; contractor: PublicContractorRow }
  | { kind: "already_attached"; contractor: PublicContractorRow };

export function resolveClaimEntry(input: {
  slug: string | null | undefined;
  search: URLSearchParams;
  contractor: PublicContractorRow | null;
  viewerUserId: string | null;
}): ClaimEntry {
  const token = input.search.get("t");
  if (isOpaqueToken(token)) return { kind: "redirect_token", path: canonicalTokenPath(token, input.search) };
  if (!isValidSlug(input.slug)) return { kind: "not_found" };
  const c = input.contractor;
  // Un nom vide = pas de fiche affichable : jamais de nom inventé.
  if (!c || !c.business_name?.trim()) return { kind: "not_found" };
  if (input.viewerUserId && c.user_id === input.viewerUserId) return { kind: "own_profile", contractor: c };
  // contractors.user_id est obligatoire : une fiche publiée appartient déjà à un compte.
  return { kind: "already_attached", contractor: c };
}

/** Libellé de vérification d'une fiche publique (jamais « vérifiée » sans statut serveur). */
export function publicVerificationLabel(status: string | null | undefined, lang: "fr" | "en"): string {
  if (status === "verified_active") return lang === "en" ? "Verified by UNPRO" : "Vérifiée par UNPRO";
  if (status === "published_pending_verification") return lang === "en" ? "Verification pending" : "Vérification en attente";
  return lang === "en" ? "Not verified" : "Non vérifiée";
}

export type ActivationStage =
  | "signed_out"
  | "no_profile"
  | "claimed_payment_unconfirmed"
  | "paid_pending_verification"
  | "active_verified";

/**
 * Étape réelle, relue du serveur : contractor_plan_code() ne renvoie
 * « presence » qu'avec un paiement LIVE signé et valide ; la publication
 * vérifiée vient de contractors.public_status. Une URL ne change rien.
 */
export function activationStage(input: {
  signedIn: boolean;
  contractor: { public_status: string | null } | null;
  planCode: string | null;
}): ActivationStage {
  if (!input.signedIn) return "signed_out";
  if (!input.contractor) return "no_profile";
  const paid = !!input.planCode && input.planCode !== "free";
  if (!paid) return "claimed_payment_unconfirmed";
  return input.contractor.public_status === "verified_active" ? "active_verified" : "paid_pending_verification";
}
