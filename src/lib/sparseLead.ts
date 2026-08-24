// Mirror of supabase/functions/_shared/sparseLead.ts (UI labels only).
// Keep the identity rules in sync — pure functions, no imports.

export type IdentityStatus = "company_confirmed" | "sparse_person" | "unknown";

export const PENDING_CATEGORY = "a_confirmer";

const PERSON_STOPWORDS = new Set(["inc", "inc.", "ltee", "ltée", "ltd", "enr", "senc"]);

function clean(v: string | null | undefined): string {
  return (v ?? "").toString().replace(/\s+/g, " ").trim();
}

function looksLikeCompany(name: string): boolean {
  const n = name.toLowerCase();
  if (/(inc\.?|lt[ée]e|ltd\.?|enr\.?|senc|construction|r[ée]novation|entreprise|groupe|services?|solution|toiture|isolation|plomberie|excavation|peinture|design|d[ée]mo)/i.test(n)) {
    return true;
  }
  const tokens = n.split(/[\s\-]+/).filter((t) => t && !PERSON_STOPWORDS.has(t));
  return tokens.length > 2;
}

export function resolveIdentityStatus(row: {
  business_name?: string | null;
  owner_name?: string | null;
  category_slug?: string | null;
}): IdentityStatus {
  const business = clean(row.business_name);
  const person = clean(row.owner_name);
  if (business && looksLikeCompany(business)) return "company_confirmed";
  if (business || person) return "sparse_person";
  return "unknown";
}

export function isSparseProspect(row: {
  business_name?: string | null;
  owner_name?: string | null;
  category_slug?: string | null;
}): boolean {
  const status = resolveIdentityStatus(row);
  return status !== "company_confirmed" || !clean(row.category_slug) || clean(row.category_slug) === PENDING_CATEGORY;
}

export const SPARSE_BADGE_LABEL = "À enrichir";
export const SPARSE_BADGE_HINT = "Identité entreprise à confirmer — contact conservé";

export function pendingFields(row: {
  business_name?: string | null;
  owner_name?: string | null;
  category_slug?: string | null;
  email?: string | null;
  website_url?: string | null;
}): string[] {
  const out: string[] = [];
  if (resolveIdentityStatus(row) !== "company_confirmed") out.push("Entreprise");
  if (!clean(row.category_slug) || clean(row.category_slug) === PENDING_CATEGORY) out.push("Métier");
  if (!clean(row.email)) out.push("Courriel");
  if (!clean(row.website_url)) out.push("Site web");
  return out;
}
