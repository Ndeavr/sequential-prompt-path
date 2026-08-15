/**
 * officialSources — adapter for OFFICIAL VERIFIED SOURCES (government / public registries).
 *
 * Source-aware model. Three kinds are supported today:
 *   - rbq       : Régie du bâtiment du Québec — licences actives (identity seed)
 *   - req       : Registre des entreprises du Québec (identity reconciliation only)
 *   - novoclimat: Novoclimat certified ventilation specialists (certification list)
 *
 * Hard rules:
 *  - Contact data is NEVER inferred. Only phone/email explicitly published in the
 *    official record are stored.
 *  - A record WITHOUT published contact is RETAINED with contact_status
 *    'needs_enrichment'. It is never rejected and never promoted for outreach.
 *  - Certification / registry provenance is trust, never a CASL bypass. Opt-out,
 *    suppression and commercial-send gates still apply downstream.
 *  - Specialty labels come only from what the source itself establishes. RBQ/REQ
 *    records are NEVER labelled certified ventilation.
 */

export type SourceKind = "rbq" | "req" | "novoclimat";

export type ContactStatus =
  | "published_in_source"
  | "needs_enrichment"
  | "source_confirmed"
  | "no_contact_found";

export type OfficialRecord = {
  /** Stable non-null identifier within the source (licence no, NEQ, certificate no). */
  source_record_key?: string | null;
  certificate_no?: string | null;
  neq?: string | null;
  rbq_license?: string | null;
  business_name: string;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  address?: string | null;
  postal_code?: string | null;
  municipality?: string | null;
  region?: string | null;
  /** Free-form categories/trades published by the source (RBQ subclasses, etc.). */
  categories?: string[] | null;
  raw?: Record<string, unknown> | null;
};

export type OfficialSourceDoc = {
  source_key: string;
  source_kind?: SourceKind;
  source_name: string;
  source_url: string;
  publisher?: string;
  certification?: string;
  document_sha256?: string;
  document_updated_label?: string | null;
  source_updated_at?: string | null;
  records: OfficialRecord[];
};

/** Geographic priority (Laval first, then Rive-Nord / Laurentides / Lanaudière). */
export const REGION_PRIORITY: Array<{ match: RegExp; rank: number; label: string }> = [
  { match: /^laval/i, rank: 1, label: "Laval" },
  { match: /laurentides/i, rank: 2, label: "Laurentides" },
  { match: /lanaudi/i, rank: 3, label: "Lanaudière" },
  { match: /montr[eé]al/i, rank: 4, label: "Montréal" },
  { match: /mont[eé]r[eé]gie/i, rank: 5, label: "Montérégie" },
];

/** Pilot territories + trades (Québec only). */
export const PILOT_REGIONS = ["laval", "montréal", "laurentides", "lanaudière", "montérégie"];
export const PILOT_TRADES = ["isolation", "ventilation", "toiture", "plomberie", "fondation", "rénovation"];

/** Regions whose name is also the municipality — the only case where a city can be stated. */
const REGION_IS_CITY = /^(laval|montr[eé]al)$/i;

export function priorityRank(region: string | null | undefined): number {
  const r = (region ?? "").trim();
  for (const p of REGION_PRIORITY) if (p.match.test(r)) return p.rank;
  return 99;
}

export function cityFromRegion(region: string | null | undefined): string | null {
  const r = (region ?? "").trim();
  return REGION_IS_CITY.test(r) ? (/laval/i.test(r) ? "Laval" : "Montréal") : null;
}

export function normalizeName(name: string | null | undefined): string {
  return (name ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\b(inc|ltd|ltee|enr|enrg|senc|sencrl|s\.e\.n\.c|les|le|la)\b\.?/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Strict NANP normalization. Returns null when the published number is unusable. */
export function toE164(raw: string | null | undefined): string | null {
  const digits = String(raw ?? "").replace(/\D/g, "");
  const ten = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  if (ten.length !== 10) return null;
  if (!/^[2-9]/.test(ten) || !/^[2-9]/.test(ten.slice(3, 4))) return null;
  return `+1${ten}`;
}

export function normalizeEmail(raw: string | null | undefined): string | null {
  const v = String(raw ?? "").trim().toLowerCase();
  if (!v || !/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/.test(v)) return null;
  return v;
}

export function normalizePostal(raw: string | null | undefined): string | null {
  const v = String(raw ?? "").toUpperCase().replace(/\s+/g, "");
  const m = v.match(/^([A-Z]\d[A-Z])(\d[A-Z]\d)$/);
  return m ? `${m[1]} ${m[2]}` : null;
}

export function normalizeNeq(raw: string | null | undefined): string | null {
  const d = String(raw ?? "").replace(/\D/g, "");
  return d.length === 10 ? d : null;
}

export function normalizeRbq(raw: string | null | undefined): string | null {
  const d = String(raw ?? "").replace(/\D/g, "");
  return d.length === 10 ? `${d.slice(0, 4)}-${d.slice(4, 8)}-${d.slice(8)}` : null;
}

export function normalizeDomain(raw: string | null | undefined): string | null {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  try {
    const u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
    const host = u.hostname.toLowerCase().replace(/^www\./, "");
    return host.includes(".") ? host : null;
  } catch {
    return null;
  }
}

export function domainOfEmail(email: string | null): string | null {
  if (!email) return null;
  const d = email.split("@")[1] ?? null;
  if (!d) return null;
  const free = ["gmail.com", "hotmail.com", "outlook.com", "yahoo.ca", "yahoo.com", "videotron.ca", "bellnet.ca", "live.ca", "icloud.com", "sympatico.ca", "globetrotter.net", "telus.net"];
  return free.includes(d) ? null : d;
}

/**
 * Specialty scoring — SOURCE AWARE. Only what the record itself establishes.
 * RBQ/REQ never receive a ventilation certification signal: their trades come
 * from the published licence subclasses / declared activity only.
 */
export function specialtyBonus(
  rec: { business_name: string; categories?: string[] | null },
  ctx: { source_kind: SourceKind; certification?: string | null },
): { bonus: number; signals: string[] } {
  const signals: string[] = [];
  let bonus = 0;
  const haystack = [rec.business_name, ...(rec.categories ?? [])].join(" ").toLowerCase();

  if (ctx.source_kind === "novoclimat") {
    // Only the Novoclimat list itself proves certified ventilation.
    signals.push("certified_ventilation");
    bonus += 10;
    if (/centralis/i.test(ctx.certification ?? "")) { signals.push("ventilation_centralisee"); bonus += 5; }
  }

  if (/isolation|enveloppe|[eé]tanch|ur[eé]thane/.test(haystack)) { signals.push("enveloppe_isolation"); bonus += 10; }
  if (/ventilation|vrc|vre|\bair\b|cvac|climatisation/.test(haystack)) { signals.push("ventilation_signal"); bonus += 3; }
  if (/toiture|couvreur|toit/.test(haystack)) { signals.push("toiture"); bonus += 3; }
  if (/plomberie|plombier/.test(haystack)) { signals.push("plomberie"); bonus += 3; }
  if (/fondation|excavation|b[eé]ton/.test(haystack)) { signals.push("fondation"); bonus += 3; }
  if (/r[eé]novation|construction|entrepreneur g[eé]n[eé]ral/.test(haystack)) { signals.push("renovation"); bonus += 2; }

  return { bonus, signals };
}

/** Trust bonus per source kind (provenance, not a gate bypass). */
export const TRUST_BONUS_BY_KIND: Record<SourceKind, number> = {
  rbq: 25,
  req: 15,
  novoclimat: 20,
};
/** Backwards-compatible default used by the Novoclimat ingest. */
export const OFFICIAL_TRUST_BONUS = TRUST_BONUS_BY_KIND.novoclimat;

export type NormalizedOfficialRecord = {
  source_key: string;
  source_kind: SourceKind;
  source_name: string;
  source_url: string;
  source_record_key: string;
  certification: string | null;
  certificate_no: string | null;
  neq: string | null;
  rbq_license: string | null;
  business_name: string;
  business_name_norm: string;
  phone_raw: string | null;
  phone_e164: string | null;
  email: string | null;
  email_domain: string | null;
  website_url: string | null;
  official_domain: string | null;
  address: string | null;
  postal_code: string | null;
  region: string | null;
  municipality: string | null;
  city: string | null;
  priority_rank: number;
  specialty_bonus: number;
  trust_bonus: number;
  trust_score: number;
  contact_status: ContactStatus;
  raw_record: Record<string, unknown>;
  provenance: Record<string, unknown>;
  source_updated_at: string | null;
  /** Set only when the record itself is unusable (no stable key / no name). */
  parse_error?: string;
};

/** Deterministic stable key: explicit key > licence > NEQ > certificate > name+locality hash. */
export function buildSourceRecordKey(rec: OfficialRecord): string {
  const explicit = (rec.source_record_key ?? "").trim();
  if (explicit) return explicit;
  const rbq = normalizeRbq(rec.rbq_license);
  if (rbq) return `rbq:${rbq}`;
  const neq = normalizeNeq(rec.neq);
  if (neq) return `neq:${neq}`;
  const cert = (rec.certificate_no ?? "").trim();
  if (cert) return cert;
  return `h_${simpleHash(`${normalizeName(rec.business_name)}|${rec.region ?? ""}|${rec.municipality ?? ""}`)}`;
}

/** Small deterministic FNV-1a hash (stable across runs and runtimes). */
export function simpleHash(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

export function normalizeOfficialRecord(
  doc: OfficialSourceDoc,
  rec: OfficialRecord,
  fetchedAt: string,
): NormalizedOfficialRecord {
  const source_kind: SourceKind = doc.source_kind ?? "novoclimat";
  const phone_e164 = toE164(rec.phone);
  const email = normalizeEmail(rec.email);
  const { bonus, signals } = specialtyBonus(rec, { source_kind, certification: doc.certification });
  const region = rec.region?.trim() || null;
  const trust_bonus = TRUST_BONUS_BY_KIND[source_kind];
  const official_domain = normalizeDomain(rec.website ?? null);
  const business_name = (rec.business_name ?? "").trim();

  const contact_status: ContactStatus = phone_e164 || email ? "published_in_source" : "needs_enrichment";

  return {
    source_key: doc.source_key,
    source_kind,
    source_name: doc.source_name,
    source_url: doc.source_url,
    source_record_key: buildSourceRecordKey(rec),
    certification: doc.certification ?? null,
    certificate_no: rec.certificate_no ?? null,
    neq: normalizeNeq(rec.neq),
    rbq_license: normalizeRbq(rec.rbq_license),
    business_name,
    business_name_norm: normalizeName(business_name),
    phone_raw: rec.phone ?? null,
    phone_e164,
    email,
    email_domain: domainOfEmail(email),
    website_url: rec.website ?? null,
    official_domain,
    address: rec.address ?? null,
    postal_code: normalizePostal(rec.postal_code),
    region,
    municipality: rec.municipality ?? null,
    city: rec.municipality ?? cityFromRegion(region),
    priority_rank: priorityRank(region ?? rec.municipality),
    specialty_bonus: bonus,
    trust_bonus,
    trust_score: trust_bonus + bonus,
    contact_status,
    raw_record: (rec.raw ?? {}) as Record<string, unknown>,
    provenance: {
      provenance: "official_verified_source",
      source_kind,
      publisher: doc.publisher ?? doc.source_name,
      source_name: doc.source_name,
      source_url: doc.source_url,
      document_sha256: doc.document_sha256 ?? null,
      document_updated_label: doc.document_updated_label ?? null,
      certification: doc.certification ?? null,
      certificate_no: rec.certificate_no ?? null,
      neq: normalizeNeq(rec.neq),
      rbq_license: normalizeRbq(rec.rbq_license),
      specialty_signals: signals,
      contact_published_in_source: { phone: Boolean(phone_e164), email: Boolean(email) },
      city_provenance: rec.municipality
        ? "declared_in_source"
        : cityFromRegion(region)
          ? "region_is_municipality"
          : "unknown",
      fetched_at: fetchedAt,
    },
    source_updated_at: doc.source_updated_at ?? null,
    parse_error: business_name ? undefined : "missing_business_name",
  };
}

/** Dedupe precedence: NEQ > RBQ > phone/domain > name+postal. */
export function dedupeKeys(n: NormalizedOfficialRecord): string[] {
  const keys: string[] = [];
  if (n.neq) keys.push(`neq:${n.neq}`);
  if (n.rbq_license) keys.push(`rbq:${n.rbq_license}`);
  if (n.phone_e164) keys.push(`phone:${n.phone_e164}`);
  if (n.official_domain) keys.push(`domain:${n.official_domain}`);
  if (n.email_domain) keys.push(`domain:${n.email_domain}`);
  keys.push(`name:${n.business_name_norm}|${n.postal_code ?? n.city ?? ""}`);
  return keys;
}

/** Deterministic ordering: priority region, then specialty strength, then name. */
export function rankCandidates(rows: NormalizedOfficialRecord[]): NormalizedOfficialRecord[] {
  return [...rows].sort((a, b) =>
    a.priority_rank - b.priority_rank ||
    b.specialty_bonus - a.specialty_bonus ||
    a.business_name_norm.localeCompare(b.business_name_norm));
}
