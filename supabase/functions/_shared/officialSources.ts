/**
 * officialSources — adapter for OFFICIAL VERIFIED SOURCES (government / public registries).
 *
 * Why: Google Places discovery is capped (25 external calls/day, circuit breaker,
 * 14-day cache). Official public lists published by the Québec government are a
 * zero-cost, high-trust supply path. This adapter normalizes those records so they
 * enter the SAME canonical pipeline (contractor_prospects -> acquisition-queue-worker
 * -> recruitment-orchestrator). It is NOT a parallel recruitment system.
 *
 * Hard rules:
 *  - Contact data is NEVER inferred. Only phone/email explicitly published in the
 *    official document are stored.
 *  - Certification is provenance, not a CASL bypass. Opt-out / suppression /
 *    contactability gates still apply downstream.
 */

export type OfficialRecord = {
  certificate_no: string | null;
  business_name: string;
  phone: string | null;
  email: string | null;
  region: string | null;
  municipality?: string | null;
};

export type OfficialSourceDoc = {
  source_key: string;
  source_name: string;
  source_url: string;
  certification: string;
  document_sha256: string;
  document_updated_label: string | null;
  records: OfficialRecord[];
};

/** Geographic priority (requirement: Laval first, then Rive-Nord / Laurentides / Lanaudière). */
export const REGION_PRIORITY: Array<{ match: RegExp; rank: number; label: string }> = [
  { match: /^laval/i, rank: 1, label: "Laval" },
  { match: /laurentides/i, rank: 2, label: "Laurentides" },
  { match: /lanaudi/i, rank: 3, label: "Lanaudière" },
  { match: /montr[eé]al/i, rank: 4, label: "Montréal" },
  { match: /mont[eé]r[eé]gie/i, rank: 5, label: "Montérégie" },
];

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
    .replace(/\b(inc|ltd|ltee|ltee|enr|enrg|senc|sencrl|s\.e\.n\.c|les|le|la)\b\.?/g, " ")
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

export function domainOfEmail(email: string | null): string | null {
  if (!email) return null;
  const d = email.split("@")[1] ?? null;
  if (!d) return null;
  const free = ["gmail.com", "hotmail.com", "outlook.com", "yahoo.ca", "yahoo.com", "videotron.ca", "bellnet.ca", "live.ca", "icloud.com", "sympatico.ca", "globetrotter.net", "telus.net"];
  return free.includes(d) ? null : d;
}

/**
 * Specialty scoring bonus. Only what the official record itself establishes:
 * certified ventilation (base), centralized systems, and insulation / building
 * envelope / air-sealing signals present in the legal business name.
 * Nothing is fabricated.
 */
export function specialtyBonus(rec: { business_name: string }, certification: string): {
  bonus: number;
  signals: string[];
} {
  const signals: string[] = ["certified_ventilation"];
  let bonus = 10;
  if (/centralis/i.test(certification)) { signals.push("ventilation_centralisee"); bonus += 5; }
  const n = rec.business_name.toLowerCase();
  if (/isolation|enveloppe|[eé]tanch|uréthane|urethane/.test(n)) { signals.push("enveloppe_isolation"); bonus += 10; }
  if (/ventilation|vrc|vre|air/.test(n)) { signals.push("ventilation_in_name"); bonus += 3; }
  return { bonus, signals };
}

/** Trust bonus for a government-published certification (provenance, not a gate bypass). */
export const OFFICIAL_TRUST_BONUS = 20;

export type NormalizedOfficialRecord = {
  source_key: string;
  source_name: string;
  source_url: string;
  certification: string;
  certificate_no: string | null;
  business_name: string;
  business_name_norm: string;
  phone_raw: string | null;
  phone_e164: string | null;
  email: string | null;
  email_domain: string | null;
  region: string | null;
  municipality: string | null;
  city: string | null;
  priority_rank: number;
  specialty_bonus: number;
  trust_bonus: number;
  provenance: Record<string, unknown>;
  parse_error?: string;
};

export function normalizeOfficialRecord(
  doc: OfficialSourceDoc,
  rec: OfficialRecord,
  fetchedAt: string,
): NormalizedOfficialRecord {
  const phone_e164 = toE164(rec.phone);
  const email = normalizeEmail(rec.email);
  const { bonus, signals } = specialtyBonus(rec, doc.certification);
  const region = rec.region?.trim() || null;
  return {
    source_key: doc.source_key,
    source_name: doc.source_name,
    source_url: doc.source_url,
    certification: doc.certification,
    certificate_no: rec.certificate_no,
    business_name: rec.business_name,
    business_name_norm: normalizeName(rec.business_name),
    phone_raw: rec.phone ?? null,
    phone_e164,
    email,
    email_domain: domainOfEmail(email),
    region,
    municipality: rec.municipality ?? null,
    city: rec.municipality ?? cityFromRegion(region),
    priority_rank: priorityRank(region),
    specialty_bonus: bonus,
    trust_bonus: OFFICIAL_TRUST_BONUS,
    provenance: {
      provenance: "official_verified_source",
      publisher: "Gouvernement du Québec — Ministère de l'Environnement (Novoclimat)",
      source_name: doc.source_name,
      source_url: doc.source_url,
      document_sha256: doc.document_sha256,
      document_updated_label: doc.document_updated_label,
      certification: doc.certification,
      certificate_no: rec.certificate_no,
      specialty_signals: signals,
      contact_published_in_source: { phone: Boolean(rec.phone), email: Boolean(rec.email) },
      city_provenance: rec.municipality
        ? "declared_in_source"
        : cityFromRegion(region)
          ? "region_is_municipality"
          : "unknown",
      fetched_at: fetchedAt,
    },
    parse_error: !phone_e164 && !email ? "no_published_contact" : undefined,
  };
}

/** Deterministic ordering: priority region, then specialty strength, then name. */
export function rankCandidates(rows: NormalizedOfficialRecord[]): NormalizedOfficialRecord[] {
  return [...rows].sort((a, b) =>
    a.priority_rank - b.priority_rank ||
    b.specialty_bonus - a.specialty_bonus ||
    a.business_name_norm.localeCompare(b.business_name_norm));
}
