/**
 * ckanSource — Données Québec (CKAN) adapter.
 *
 * Uses the OFFICIAL CKAN API (`package_show`) to discover the currently active
 * resource of a dataset. We never hardcode an expiring download URL and we never
 * scrape the HTML portal.
 *
 * Pure + testable: every function here is deterministic except `ckanPackageShow`.
 */

export const CKAN_BASE = "https://www.donneesquebec.ca/recherche/api/3/action";

export type CkanResource = {
  id: string;
  name?: string;
  format?: string;
  url?: string;
  last_modified?: string | null;
  created?: string | null;
  state?: string;
  hash?: string | null;
  datastore_active?: boolean;
};

export type CkanPackage = {
  id: string;
  name: string;
  title?: string;
  metadata_modified?: string;
  resources: CkanResource[];
};

const PREFERRED_FORMATS = ["csv", "xlsx", "xls"];

/** Pick the freshest active tabular resource from dataset metadata. */
export function pickResource(resources: CkanResource[]): CkanResource | null {
  const usable = (resources ?? []).filter((r) => {
    if (r.state && r.state !== "active") return false;
    const fmt = (r.format ?? "").toLowerCase();
    return PREFERRED_FORMATS.includes(fmt) && !!r.url;
  });
  if (usable.length === 0) return null;
  const score = (r: CkanResource) => PREFERRED_FORMATS.indexOf((r.format ?? "").toLowerCase());
  const ts = (r: CkanResource) => Date.parse(r.last_modified ?? r.created ?? "") || 0;
  return [...usable].sort((a, b) => score(a) - score(b) || ts(b) - ts(a))[0];
}

export async function ckanPackageShow(slug: string, signal?: AbortSignal): Promise<CkanPackage> {
  const r = await fetch(`${CKAN_BASE}/package_show?id=${encodeURIComponent(slug)}`, {
    headers: { "Accept": "application/json", "User-Agent": "UNPRO-OfficialSources/1.0 (+https://unpro.ca)" },
    signal,
  });
  if (!r.ok) throw new Error(`ckan_http_${r.status}`);
  const body = await r.json();
  if (!body?.success || !body?.result) throw new Error("ckan_invalid_response");
  return body.result as CkanPackage;
}

/* ------------------------- delimited parsing ------------------------- */

export function detectDelimiter(headerLine: string): string {
  const counts = [";", ",", "\t", "|"].map((d) => [d, headerLine.split(d).length] as const);
  return counts.sort((a, b) => b[1] - a[1])[0][0];
}

/** Minimal RFC4180-ish parser (quotes + embedded delimiters/newlines). */
export function parseDelimited(text: string): Record<string, string>[] {
  const clean = text.replace(/^\uFEFF/, "");
  const firstLine = clean.split(/\r?\n/, 1)[0] ?? "";
  const delim = detectDelimiter(firstLine);

  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < clean.length; i++) {
    const c = clean[i];
    if (inQuotes) {
      if (c === '"') {
        if (clean[i + 1] === '"') { field += '"'; i++; } else inQuotes = false;
      } else field += c;
      continue;
    }
    if (c === '"') { inQuotes = true; continue; }
    if (c === delim) { row.push(field); field = ""; continue; }
    if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; continue; }
    if (c === "\r") continue;
    field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  if (rows.length === 0) return [];

  const header = rows[0].map((h) => h.trim());
  return rows.slice(1)
    .filter((r) => r.some((v) => v && v.trim() !== ""))
    .map((r) => {
      const o: Record<string, string> = {};
      header.forEach((h, i) => { o[h] = (r[i] ?? "").trim(); });
      return o;
    });
}

/* ------------------------- column aliasing ------------------------- */

export type CanonicalField =
  | "business_name" | "neq" | "rbq_license" | "phone" | "email" | "website"
  | "address" | "postal_code" | "municipality" | "region" | "categories" | "status";

const ALIASES: Record<CanonicalField, RegExp[]> = {
  business_name: [/^(nom|nom_?de?_?l?'?entreprise|raison[_ ]?sociale|nom_assujetti|nom_entreprise|titulaire)/i],
  neq: [/neq/i, /num[eé]ro[_ ]?d?'?entreprise/i],
  rbq_license: [/licence/i, /rbq/i, /no[_ ]?licence/i],
  phone: [/t[eé]l[eé]phone/i, /^tel/i, /num[eé]ro[_ ]?de[_ ]?t[eé]l/i],
  email: [/courriel/i, /email/i, /adresse[_ ]?[eé]lectronique/i],
  website: [/site[_ ]?web/i, /site[_ ]?internet/i, /url/i],
  address: [/adresse/i, /rue/i, /voie/i],
  postal_code: [/code[_ ]?postal/i, /^cp$/i],
  municipality: [/municipalit/i, /^ville/i, /localit/i],
  region: [/r[eé]gion/i],
  categories: [/cat[eé]gorie/i, /sous[-_ ]?cat/i, /classe/i, /activit/i, /secteur/i],
  status: [/statut/i, /[eé]tat/i],
};

/** Build a header → canonical field map, defensively (French label drift tolerated). */
export function mapColumns(headers: string[]): Partial<Record<CanonicalField, string>> {
  const out: Partial<Record<CanonicalField, string>> = {};
  for (const h of headers) {
    const norm = h.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    for (const [field, patterns] of Object.entries(ALIASES) as [CanonicalField, RegExp[]][]) {
      if (out[field]) continue;
      // "adresse électronique" must map to email, not address.
      if (field === "address" && /electron|courriel|email/.test(norm)) continue;
      if (patterns.some((p) => p.test(norm) || p.test(h))) { out[field] = h; break; }
    }
  }
  return out;
}

export function pick(row: Record<string, string>, map: Partial<Record<CanonicalField, string>>, f: CanonicalField): string | null {
  const col = map[f];
  if (!col) return null;
  const v = (row[col] ?? "").trim();
  return v === "" ? null : v;
}

/* ------------------------- pilot scoping ------------------------- */

const REGION_MATCHERS: Array<{ re: RegExp; key: string }> = [
  { re: /laval/i, key: "laval" },
  { re: /montr[eé]al/i, key: "montréal" },
  { re: /laurentides|blainville|boisbriand|mirabel|saint-j[eé]r[oô]me|sainte-th[eé]r[eè]se/i, key: "laurentides" },
  { re: /lanaudi|terrebonne|mascouche|repentigny|joliette/i, key: "lanaudière" },
  { re: /mont[eé]r[eé]gie|longueuil|brossard|saint-hubert|boucherville/i, key: "montérégie" },
];

export function regionKeyFor(municipality: string | null, region: string | null): string | null {
  const hay = `${municipality ?? ""} ${region ?? ""}`;
  for (const m of REGION_MATCHERS) if (m.re.test(hay)) return m.key;
  return null;
}

const TRADE_MATCHERS: Array<{ re: RegExp; key: string }> = [
  { re: /isolation|enveloppe|[eé]tanch|ur[eé]thane|calfeutr/i, key: "isolation" },
  { re: /ventilation|vrc|vre|cvac|climatisation|chauffage/i, key: "ventilation" },
  { re: /toiture|couvreur|toit/i, key: "toiture" },
  { re: /plomberie|plombier|tuyaut/i, key: "plomberie" },
  { re: /fondation|excavation|b[eé]ton|ma[cç]onnerie/i, key: "fondation" },
  { re: /r[eé]novation|construction|b[aâ]timent|entrepreneur g[eé]n[eé]ral|charpente/i, key: "rénovation" },
];

export function tradeKeysFor(text: string | null | undefined): string[] {
  const hay = (text ?? "");
  return TRADE_MATCHERS.filter((m) => m.re.test(hay)).map((m) => m.key);
}
