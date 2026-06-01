/**
 * Dedupe Engine — shared across acquisition scrapers.
 *
 * Confidence bands:
 *  HIGH   (>= 0.90) : same google_place_id OR same rbq OR same normalized_domain
 *  MEDIUM (0.60..0.89) : phone+city OR (address + fuzzy name >= 0.85)
 *  LOW    (< 0.60) : fuzzy name only
 */

export type Band = "HIGH" | "MEDIUM" | "LOW" | "NONE";

export interface DedupeCandidate {
  business_name: string | null;
  google_place_id?: string | null;
  rbq?: string | null;
  website_url?: string | null;
  normalized_domain?: string | null;
  phone?: string | null;
  city?: string | null;
  address?: string | null;
}

export interface DedupeMatch {
  confidence: number;
  band: Band;
  matchedId: string | null;
  signals: Record<string, boolean>;
}

/* ── Normalizers ──────────────────────────────────────── */

export function normalizePhone(raw?: string | null): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D+/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return digits ? `+${digits}` : null;
}

export function normalizeDomain(url?: string | null): string | null {
  if (!url) return null;
  return url
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "")
    .trim() || null;
}

export function normalizeRbq(raw?: string | null): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D+/g, "");
  return digits || null;
}

export function normalizeName(name?: string | null): string {
  if (!name) return "";
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\b(inc|ltd|ltee|ltée|enr|enrg|srl|sencrl|le|la|les|the)\b\.?/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeAddress(addr?: string | null): string {
  if (!addr) return "";
  return addr
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/* ── Jaro-Winkler ─────────────────────────────────────── */

export function jaroWinkler(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const m = Math.floor(Math.max(a.length, b.length) / 2) - 1;
  const aMatch = new Array(a.length).fill(false);
  const bMatch = new Array(b.length).fill(false);
  let matches = 0;
  for (let i = 0; i < a.length; i++) {
    const start = Math.max(0, i - m);
    const end = Math.min(i + m + 1, b.length);
    for (let j = start; j < end; j++) {
      if (bMatch[j] || a[i] !== b[j]) continue;
      aMatch[i] = true;
      bMatch[j] = true;
      matches++;
      break;
    }
  }
  if (!matches) return 0;
  let t = 0;
  let k = 0;
  for (let i = 0; i < a.length; i++) {
    if (!aMatch[i]) continue;
    while (!bMatch[k]) k++;
    if (a[i] !== b[k]) t++;
    k++;
  }
  t /= 2;
  const jaro = (matches / a.length + matches / b.length + (matches - t) / matches) / 3;
  // Winkler prefix bonus
  let prefix = 0;
  for (let i = 0; i < Math.min(4, a.length, b.length); i++) {
    if (a[i] === b[i]) prefix++; else break;
  }
  return jaro + prefix * 0.1 * (1 - jaro);
}

/* ── Core ─────────────────────────────────────────────── */

export async function classifyDuplicate(
  candidate: DedupeCandidate,
  supabase: any,
): Promise<DedupeMatch> {
  const signals: Record<string, boolean> = {};
  let bestConf = 0;
  let matchedId: string | null = null;

  const placeId = candidate.google_place_id ?? null;
  const rbq = normalizeRbq(candidate.rbq);
  const domain = candidate.normalized_domain ?? normalizeDomain(candidate.website_url);
  const phone = normalizePhone(candidate.phone);
  const city = candidate.city?.trim().toLowerCase() ?? null;
  const nameN = normalizeName(candidate.business_name);
  const addrN = normalizeAddress(candidate.address);

  // 1. HIGH: google_place_id
  if (placeId) {
    const { data } = await supabase
      .from("contractor_prospects")
      .select("id")
      .eq("google_place_id", placeId)
      .limit(1)
      .maybeSingle();
    if (data?.id) {
      signals.google_place_id = true;
      bestConf = Math.max(bestConf, 1.0);
      matchedId = matchedId ?? data.id;
    }
  }

  // 2. HIGH: rbq
  if (rbq) {
    const { data } = await supabase
      .from("contractor_prospects")
      .select("id, rbq")
      .not("rbq", "is", null)
      .limit(50);
    const hit = (data ?? []).find((r: any) => normalizeRbq(r.rbq) === rbq);
    if (hit) {
      signals.rbq = true;
      bestConf = Math.max(bestConf, 1.0);
      matchedId = matchedId ?? hit.id;
    }
  }

  // 3. HIGH: normalized_domain
  if (domain) {
    const { data } = await supabase
      .from("contractor_prospects")
      .select("id")
      .eq("normalized_domain", domain)
      .limit(1)
      .maybeSingle();
    if (data?.id) {
      signals.normalized_domain = true;
      bestConf = Math.max(bestConf, 0.95);
      matchedId = matchedId ?? data.id;
    }
  }

  // Early exit: HIGH locked in
  if (bestConf >= 0.9) {
    return { confidence: bestConf, band: "HIGH", matchedId, signals };
  }

  // 4. MEDIUM: phone + city
  if (phone && city) {
    const { data } = await supabase
      .from("contractor_prospects")
      .select("id, phone, city")
      .ilike("city", city)
      .not("phone", "is", null)
      .limit(50);
    const hit = (data ?? []).find((r: any) => normalizePhone(r.phone) === phone);
    if (hit) {
      signals.phone_city = true;
      bestConf = Math.max(bestConf, 0.75);
      matchedId = matchedId ?? hit.id;
    }
  }

  // 5. MEDIUM: address + fuzzy name (≥0.85)
  if (addrN && nameN && city) {
    const { data } = await supabase
      .from("contractor_prospects")
      .select("id, business_name, address")
      .ilike("city", city)
      .not("address", "is", null)
      .limit(100);
    for (const r of data ?? []) {
      const ra = normalizeAddress(r.address);
      const rn = normalizeName(r.business_name);
      if (!ra || !rn) continue;
      // Address: cheap token overlap; Name: Jaro-Winkler
      const addrTokens = new Set(addrN.split(" "));
      const overlap = ra.split(" ").filter((t) => addrTokens.has(t)).length;
      const addrSim = overlap / Math.max(addrTokens.size, 1);
      const nameSim = jaroWinkler(nameN, rn);
      if (addrSim >= 0.5 && nameSim >= 0.85) {
        signals.address_name = true;
        if (0.7 > bestConf) {
          bestConf = 0.7;
          matchedId = matchedId ?? r.id;
        }
        break;
      }
    }
  }

  // 6. LOW: fuzzy name only (≥0.92, same city if available)
  if (nameN && bestConf < 0.6) {
    let q = supabase
      .from("contractor_prospects")
      .select("id, business_name, city")
      .not("business_name", "is", null)
      .limit(100);
    if (city) q = q.ilike("city", city);
    const { data } = await q;
    for (const r of data ?? []) {
      const rn = normalizeName(r.business_name);
      if (!rn) continue;
      const sim = jaroWinkler(nameN, rn);
      if (sim >= 0.92) {
        signals.fuzzy_name = true;
        if (0.45 > bestConf) {
          bestConf = 0.45;
          matchedId = matchedId ?? r.id;
        }
        break;
      }
    }
  }

  let band: Band;
  if (bestConf >= 0.9) band = "HIGH";
  else if (bestConf >= 0.6) band = "MEDIUM";
  else if (bestConf > 0) band = "LOW";
  else band = "NONE";

  return { confidence: bestConf, band, matchedId, signals };
}

/* ── Merge helper (non-destructive) ───────────────────── */

/**
 * Returns the patch to apply to an existing prospect from a fresh candidate.
 * Only fills NULL/empty fields; numeric counters always refresh.
 */
export function buildEnrichmentPatch(
  existing: Record<string, any>,
  fresh: Record<string, any>,
): Record<string, any> {
  const patch: Record<string, any> = {};
  const fillable = [
    "phone",
    "email",
    "website_url",
    "google_business_url",
    "address",
    "postal_code",
    "owner_name",
    "legal_name",
    "rbq",
    "neq",
    "normalized_domain",
    "google_place_id",
  ];
  for (const k of fillable) {
    const ev = existing?.[k];
    const fv = fresh?.[k];
    if ((ev == null || ev === "") && fv != null && fv !== "") {
      patch[k] = fv;
    }
  }
  // Always refresh observable signals
  if (fresh.review_count != null) patch.review_count = fresh.review_count;
  if (fresh.review_rating != null) patch.review_rating = fresh.review_rating;
  if (fresh.raw_data) {
    patch.raw_data = { ...(existing.raw_data ?? {}), ...fresh.raw_data };
  }
  return patch;
}
