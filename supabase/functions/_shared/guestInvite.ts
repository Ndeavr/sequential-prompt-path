/**
 * Invitations protégées pour dossiers d'import manuel (ex. APCHQ) — sans prospect.
 * - Jeton aléatoire 256 bits, préfixe "gi_", seul le SHA-256 est stocké.
 * - Possession du lien ≠ propriété : la revendication passe en
 *   `pending_verification` et n'ouvre ni paiement ni accès privilégié.
 * - Ne crée jamais de prospect, compte, lead ni message.
 */
// deno-lint-ignore-file no-explicit-any
export const GUEST_PREFIX = "gi_";
export const GUEST_TTL_DAYS = 14;
const MAX_OPENS = 50;
const MAX_CLAIM_ATTEMPTS = 5;

export const isGuestToken = (t: string) => t.startsWith(GUEST_PREFIX) && /^gi_[A-Za-z0-9_-]{43}$/.test(t);

export function generateGuestToken(): string {
  const b = crypto.getRandomValues(new Uint8Array(32));
  let s = btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return GUEST_PREFIX + s;
}

export async function sha256Hex(input: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(d)).map((x) => x.toString(16).padStart(2, "0")).join("");
}

async function loadActive(admin: any, token: string) {
  if (!isGuestToken(token)) return { error: "token_not_found" as const };
  const hash = await sha256Hex(token);
  const { data: link } = await admin.from("manual_import_claim_links")
    .select("id, import_row_id, expires_at, revoked_at, opened_count, claim_user_id, claim_status, claim_attempts, claim_requested_at")
    .eq("token_hash", hash).maybeSingle();
  if (!link) return { error: "token_not_found" as const };
  if (link.revoked_at) return { error: "token_revoked" as const };
  if (new Date(link.expires_at).getTime() <= Date.now()) return { error: "token_expired" as const };
  return { link };
}

export async function resolveGuestInvite(admin: any, token: string) {
  const r = await loadActive(admin, token);
  if ("error" in r) return { status: r.error === "token_not_found" ? 404 : 410, body: { ok: false, reason: r.error } };
  const { link } = r;
  if (link.opened_count >= MAX_OPENS) return { status: 429, body: { ok: false, reason: "rate_limited" } };
  await admin.from("manual_import_claim_links")
    .update({ opened_count: link.opened_count + 1, last_opened_at: new Date().toISOString() }).eq("id", link.id);
  const { data: row } = await admin.from("acquisition_manual_import_rows")
    .select("company, city, category, status").eq("id", link.import_row_id).maybeSingle();
  if (!row || row.status !== "needs_review") return { status: 410, body: { ok: false, reason: "token_revoked" } };
  return {
    status: 200,
    body: {
      ok: true,
      kind: "guest_invite",
      company_name: row.company ?? null,
      city: row.city ?? null,
      category: row.category ?? null,
      provenance: "declared",
      rbq_status: "not_verified",
      appointments_promised: null,
      claim_status: link.claim_status,
      expires_at: link.expires_at,
      checkout_available: false,
      next_step: "ownership_verification_required",
    },
  };
}

export async function claimGuestInvite(admin: any, token: string, userId: string) {
  const r = await loadActive(admin, token);
  if ("error" in r) return { status: r.error === "token_not_found" ? 404 : 410, body: { ok: false, reason: r.error } };
  const { link } = r;
  if (link.claim_user_id && link.claim_user_id !== userId) {
    return { status: 409, body: { ok: false, reason: "claimed_by_other" } };
  }
  if (link.claim_attempts >= MAX_CLAIM_ATTEMPTS) return { status: 429, body: { ok: false, reason: "rate_limited" } };
  const { error } = await admin.from("manual_import_claim_links").update({
    claim_user_id: userId,
    claim_requested_at: link.claim_requested_at ?? new Date().toISOString(),
    claim_status: link.claim_status === "none" ? "pending_verification" : link.claim_status,
    claim_attempts: link.claim_attempts + 1,
  }).eq("id", link.id).or(`claim_user_id.is.null,claim_user_id.eq.${userId}`);
  if (error) return { status: 500, body: { ok: false, reason: "claim_failed" } };
  return {
    status: 200,
    body: { ok: true, kind: "guest_invite", claim_status: link.claim_status === "none" ? "pending_verification" : link.claim_status, checkout_available: false, next_step: "ownership_verification_required" },
  };
}
