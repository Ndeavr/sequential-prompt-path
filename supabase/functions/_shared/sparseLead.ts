// PROTECTED — UNPRO sparse-lead identity contract.
//
// Acquisition rule (canonical): a contractor prospect is NEVER discarded just
// because we only captured a person name + phone (typical Facebook-comment
// lead). Unknown business fields stay `pending`, the source context is kept,
// enrichment runs, and the prospect remains in the pool even when enrichment
// fails. Only phone/consent gates decide outreach.
//
// Mirror (UI labels only): src/lib/sparseLead.ts — keep in sync.

export type IdentityStatus = "company_confirmed" | "sparse_person" | "unknown";

/** Placeholder used where a category is NOT NULL but unknown. Never sent to users. */
export const PENDING_CATEGORY = "a_confirmer";

/** Qualification bucket for sparse leads awaiting identity enrichment. */
export const SPARSE_QUALIFICATION = "needs_enrichment";

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
  // "Prénom Nom" (2 tokens, no company keyword) reads as a person.
  return tokens.length > 2;
}

export type IdentityInput = {
  business_name?: string | null;
  legal_name?: string | null;
  owner_name?: string | null;
  contact_name?: string | null;
  category_slug?: string | null;
  category?: string | null;
  trade?: string | null;
};

export type ResolvedIdentity = {
  identity_status: IdentityStatus;
  /** Best available label for internal display. Never claims a business. */
  display_name: string | null;
  /** Person first name usable in outreach greetings. */
  first_name: string | null;
  /** Full person name when known. */
  person_name: string | null;
  /** Confirmed business name, or null when unknown/pending. */
  company_name: string | null;
  /** Category to persist (never null) — PENDING_CATEGORY when unknown. */
  category: string;
  /** True when the category is a placeholder awaiting enrichment. */
  category_pending: boolean;
  /** Fields still unknown, surfaced as `pending` in admin. */
  pending_fields: string[];
  is_sparse: boolean;
};

export function resolveIdentity(input: IdentityInput): ResolvedIdentity {
  const business = clean(input.business_name) || clean(input.legal_name);
  const person = clean(input.owner_name) || clean(input.contact_name);
  const rawCategory = clean(input.category_slug) || clean(input.category) || clean(input.trade);

  let company: string | null = null;
  let identity: IdentityStatus = "unknown";

  if (business && looksLikeCompany(business)) {
    company = business;
    identity = "company_confirmed";
  } else if (business && person && clean(business).toLowerCase() === person.toLowerCase()) {
    identity = "sparse_person";
  } else if (business) {
    // Short human-looking label captured in the business field.
    identity = "sparse_person";
  } else if (person) {
    identity = "sparse_person";
  }

  const personName = person || (identity === "sparse_person" ? business || null : null);
  const first = personName ? personName.split(/\s+/)[0] : null;

  const pending: string[] = [];
  if (!company) pending.push("business_name");
  if (!rawCategory) pending.push("category");

  return {
    identity_status: identity,
    display_name: company || personName || business || null,
    first_name: first,
    person_name: personName,
    company_name: company,
    category: rawCategory || PENDING_CATEGORY,
    category_pending: !rawCategory,
    pending_fields: pending,
    is_sparse: identity !== "company_confirmed",
  };
}

/** A sparse lead is keepable when we have any usable contact point. */
export function isKeepableLead(input: IdentityInput & { phone?: string | null; phone_e164?: string | null; email?: string | null }): boolean {
  const id = resolveIdentity(input);
  const hasContact = Boolean(clean(input.phone) || clean(input.phone_e164) || clean(input.email));
  const hasIdentity = Boolean(id.company_name || id.person_name);
  return hasContact && hasIdentity;
}

/**
 * Outreach greeting for a sparse lead. Addresses the person by first name and
 * never claims knowledge of a business we have not confirmed.
 */
export function sparseSafeGreeting(firstName: string | null | undefined): string {
  const n = clean(firstName);
  return n ? `Bonjour ${n}` : "Bonjour";
}

/** Noun to use in copy — avoids "votre entreprise" when unconfirmed. */
export function outreachSubjectNoun(identity: IdentityStatus, companyName?: string | null): string {
  if (identity === "company_confirmed" && companyName) return companyName;
  if (identity === "company_confirmed") return "votre entreprise";
  return "vos services";
}
