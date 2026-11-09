/**
 * Identité canonique du parcours invité (activation 350 $), résolue côté serveur.
 *
 * - `activation_token` : ligne exacte de `verified_prospect_tokens` (non révoquée,
 *   non expirée) → prospect `verified_contractor_prospects`.
 * - `landing_token` : ligne exacte de `prospects`.
 * Aucun préfixe, aucun slug, aucun champ du client ne sert d'identité.
 *
 * Entrepreneur existant : lien explicite (`prospects.contractor_id`) ou la même
 * règle que celle que le webhook signé applique pour rattacher le paiement
 * (téléphone, puis courriel du prospect). Un seul résultat = lien; plusieurs =
 * ambigu → refus avant Stripe (connexion requise), jamais un choix arbitraire.
 */

export type InvitedIdentity =
  | { ok: true; prospectTable: "verified_contractor_prospects" | "prospects"; prospectId: string; contractorId: string | null }
  | { ok: false; status: number; code: string; message: string; next_path: string };

export const CANONICAL_ENTRY_PATH = "/entrepreneurs";

const refuse = (status: number, code: string, message: string, next_path = CANONICAL_ENTRY_PATH): InvitedIdentity =>
  ({ ok: false, status, code, message, next_path });

export const IDENTITY_REQUIRED = refuse(
  401, "verified_identity_required",
  "Ce lien d'activation n'est pas reconnu. Connectez-vous ou commencez votre profil entrepreneur pour activer votre Présence IA. Aucun paiement n'a été créé.",
);
const LOOKUP_FAILED = refuse(503, "identity_unverified", "Impossible de vérifier votre invitation pour le moment. Aucun paiement n'a été créé.");
const AMBIGUOUS = refuse(
  409, "identity_ambiguous",
  "Votre entreprise doit être confirmée dans votre espace avant ce paiement. Connectez-vous pour continuer. Aucun paiement n'a été créé.",
  "/connexion",
);

const clean = (v: unknown) => (typeof v === "string" && v.trim().length >= 8 && v.trim().length <= 200 ? v.trim() : null);

// deno-lint-ignore no-explicit-any
async function linkedContractor(db: any, phone: string | null, email: string | null): Promise<string | null | "ambiguous" | "error"> {
  for (const [col, val] of [["phone", phone], ["email", email]] as const) {
    if (!val) continue;
    const { data, error } = await db.from("contractors").select("id").eq(col, val).limit(2);
    if (error) return "error";
    const rows = (data ?? []) as { id: string }[];
    if (rows.length > 1) return "ambiguous";
    if (rows.length === 1) return rows[0].id;
  }
  return null;
}

// deno-lint-ignore no-explicit-any
export async function resolveInvitedIdentity(db: any, input: { activation_token?: unknown; landing_token?: unknown }, now = Date.now()): Promise<InvitedIdentity> {
  const activation = clean(input.activation_token);
  const landing = clean(input.landing_token);
  if (!activation && !landing) return IDENTITY_REQUIRED;

  if (activation) {
    const { data: tk, error } = await db.from("verified_prospect_tokens")
      .select("prospect_id, expires_at, revoked_at").eq("token", activation).maybeSingle();
    if (error) return LOOKUP_FAILED;
    if (!tk?.prospect_id || tk.revoked_at || (tk.expires_at && new Date(tk.expires_at).getTime() <= now)) return IDENTITY_REQUIRED;
    const { data: p, error: pErr } = await db.from("verified_contractor_prospects")
      .select("id, phone_e164, email").eq("id", tk.prospect_id).maybeSingle();
    if (pErr) return LOOKUP_FAILED;
    if (!p?.id) return IDENTITY_REQUIRED;
    const c = await linkedContractor(db, p.phone_e164 ?? null, p.email ?? null);
    if (c === "error") return LOOKUP_FAILED;
    if (c === "ambiguous") return AMBIGUOUS;
    return { ok: true, prospectTable: "verified_contractor_prospects", prospectId: p.id, contractorId: c };
  }

  const { data: p, error } = await db.from("prospects").select("id, contractor_id, email").eq("landing_token", landing).maybeSingle();
  if (error) return LOOKUP_FAILED;
  if (!p?.id) return IDENTITY_REQUIRED;
  if (p.contractor_id) return { ok: true, prospectTable: "prospects", prospectId: p.id, contractorId: p.contractor_id };
  const c = await linkedContractor(db, null, p.email ?? null);
  if (c === "error") return LOOKUP_FAILED;
  if (c === "ambiguous") return AMBIGUOUS;
  return { ok: true, prospectTable: "prospects", prospectId: p.id, contractorId: c };
}
