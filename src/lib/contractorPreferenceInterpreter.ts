/**
 * UNPRO — Interprétation des préférences entrepreneur dites « dans ses mots ».
 *
 * Phrases tapées ou dictées, FR/EN, sans virgules obligatoires : sépare les
 * travaux offerts, les travaux refusés et les règles de territoire. Pur et
 * déterministe : rien n'est inventé (aucune ville couverte, aucun temps de
 * route, aucun service non dit). Une ambiguïté bloquante (centre, unité)
 * produit UNE clarification ciblée. Les exclusions ont toujours priorité :
 * un travail ou un secteur refusé n'est jamais offert.
 */

export type TerritoryRuleKind = "radius" | "locality" | "travel_time";

export interface TerritoryRule {
  kind: TerritoryRuleKind;
  /** false = secteur exclu (priorité sur toute inclusion). */
  include: boolean;
  /** Centre ou localité tel que dit, sans extrapolation. */
  place?: string;
  /** Province présumée seulement pour les noms nus; à confirmer au géocodage. */
  province?: "QC";
  province_source?: "declared" | "default_quebec";
  /** Rayon GÉOGRAPHIQUE (à vol d'oiseau), jamais un temps de route. */
  radius_km?: number;
  radius_unit?: "km" | "mi";
  radius_value?: number;
  /** Temps de route déclaré : distinct d'un rayon, aucune conversion en km. */
  travel_minutes?: number;
  raw: string;
  status: "declared";
  source: "contractor_intake";
  confirmed: boolean;
  geocode_status: "pending";
}

export type PreferenceClarification =
  | { kind: "radius_center"; raw: string }
  | { kind: "radius_unit"; raw: string; value: number; place?: string };

export interface InterpretedPreferences {
  offered: string[];
  refused: string[];
  /** Phrase explicite « aucune exclusion » : distincte d'une absence de réponse. */
  noRefused: boolean;
  rules: TerritoryRule[];
  clarifications: PreferenceClarification[];
  raw: string;
}

const PLACE = "([A-ZÀ-Ý][\\p{L}'’.-]*(?:[ -](?:de |du |des |la |le |sur |en )?[A-ZÀ-Ý][\\p{L}'’.-]*)*)";
const CITY_PREFIX = "(?:la\\s+ville\\s+de\\s+|ville\\s+de\\s+|ville\\s+|the\\s+city\\s+of\\s+|city\\s+of\\s+)?";
const AROUND = "(?:autour\\s+de\\s+|autour\\s+d['’]|à\\s+partir\\s+de\\s+|de\\s+|d['’]|around\\s+|of\\s+|from\\s+)";

const RADIUS = new RegExp(
  `(?:dans\\s+un\\s+rayon\\s+de\\s+|rayon\\s+de\\s+|à\\s+moins\\s+de\\s+|within\\s+(?:a\\s+radius\\s+of\\s+)?|up\\s+to\\s+)?(\\d+(?:[.,]\\d+)?)\\s*(km|kilom[eè]tres?|kilometers?|kilometres?|miles?|mi)?\\b\\s*(?:de\\s+rayon\\s+)?(?:${AROUND}${CITY_PREFIX}${PLACE})?`,
  "giu",
);
const TRAVEL = new RegExp(
  `(\\d+)\\s*(minutes?|min|heures?|h|hours?)\\s*(?:de\\s+route|de\\s+voiture|de\\s+trajet|drive|driving|of\\s+driving)\\s*(?:${AROUND}${CITY_PREFIX}${PLACE})?`,
  "giu",
);
const LOCALITY = new RegExp(
  `(?:^|\\s)(?:à|a|sur\\s+la|sur\\s+le|dans\\s+la|dans\\s+le|dans|en|in|on\\s+the)\\s+${CITY_PREFIX}${PLACE}((?:\\s*(?:,|et|and|ou|or)\\s*${CITY_PREFIX}[A-ZÀ-Ý][\\p{L}'’.-]*(?:[ -][A-ZÀ-Ý][\\p{L}'’.-]*)*)*)`,
  "gu",
);
const AREA_EXCLUSION = new RegExp(
  `(?:sauf|pas\\s+(?:à|a|dans|sur)|jamais\\s+(?:à|a|dans)|except(?:\\s+in)?|excluding|not\\s+in)\\s+(?:la\\s+|le\\s+|l['’])?${CITY_PREFIX}${PLACE}((?:\\s*(?:,|et|and|ni|ou|or)\\s*[A-ZÀ-Ý][\\p{L}'’.-]*(?:[ -][A-ZÀ-Ý][\\p{L}'’.-]*)*)*)`,
  "gu",
);

const NEGATION = /\b(?:mais\s+)?(?:don['’]t\s+do|don['’]t|won['’]t\s+do|won['’]t|never|jamais|pas\s+de|pas\s+d['’]|pas\s+les|pas\s+la|pas\s+le|pas\s+des|jamais\s+de|jamais\s+d['’]|aucun(?:e)?|sans|sauf|ni\s+de|ni\s+d['’]|ni|but\s+not|except|without|no|not)\b\s*/giu;
const POSITIVE_AGAIN = /\b(?:mais\s+(?:je\s+fais|on\s+fait|oui)|par\s+contre\s+je\s+fais|but\s+i\s+do|but\s+we\s+do)\b\s*/giu;
const NONE = /\b(aucune?\s+exclusion|pas\s+d['’]exclusion|rien\s+d['’]exclu|je\s+fais\s+tout|no\s+exclusions?|nothing\s+excluded)\b/iu;

const LEAD = new Set([
  "je", "j'", "j’", "on", "nous", "i", "we", "fais", "fait", "faisons", "faire", "do", "does", "offre", "offrons", "offer",
  "m'occupe", "m’occupe", "occupe", "surtout", "principalement", "seulement", "uniquement", "aussi", "également", "mostly",
  "mainly", "only", "also", "les", "le", "la", "l'", "l’", "des", "du", "de", "d'", "d’", "the", "a", "an", "et", "and",
  "ni", "or", "ou", "ne", "n'", "n’", "plutôt", "rather", "specialize", "spécialisé", "spécialisée", "en", "in", "dans", "travaux", "work",
]);
const TRAIL = new Set(["aussi", "also", "seulement", "only", "svp", "merci", "thanks", "too", "je", "j'", "j’", "ne", "n'", "n’", "fais", "fait", "on", "nous", "i", "we", "do", "mais", "but", "par", "contre"]);

function cleanItem(s: string): string {
  const words = s.replace(/[.!?;:]+/g, " ").replace(/\s+/g, " ").trim().split(" ");
  while (words.length && LEAD.has(words[0].toLowerCase())) words.shift();
  while (words.length && TRAIL.has(words[words.length - 1].toLowerCase())) words.pop();
  // élision collée (« l'isolation », « d'entretoit »)
  const out = words.join(" ").replace(/^(?:l|d|j)['’]/i, "").trim();
  return out;
}

function splitItems(s: string): string[] {
  return s
    .split(/\s*(?:,|;|\/|\bet\b|\band\b|\bou\b|\bor\b|\bni\b|\bnor\b|\bplus\b)\s*/iu)
    .map(cleanItem)
    .filter((x) => x.length >= 2 && !/^\d+$/.test(x));
}

const norm = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/s\b/g, "").replace(/[^a-z0-9]+/g, " ").trim();
export const samePreference = (a: string, b: string) => norm(a) === norm(b);

function uniq(list: string[]): string[] {
  const out: string[] = [];
  for (const x of list) if (!out.some((y) => samePreference(x, y))) out.push(x);
  return out;
}

function placeList(first: string, rest: string): string[] {
  return [first, ...(rest ?? "").split(/\s*(?:,|\bet\b|\band\b|\bou\b|\bor\b|\bni\b)\s*/u)]
    .map((p) => p.replace(/^(?:la\s+ville\s+de|ville\s+de|ville|the\s+city\s+of|city\s+of)\s+/iu, "").trim())
    .filter((p) => /^[A-ZÀ-Ý]/u.test(p));
}

function rule(partial: Omit<TerritoryRule, "status" | "source" | "confirmed" | "geocode_status">): TerritoryRule {
  return { ...partial, status: "declared", source: "contractor_intake", confirmed: false, geocode_status: "pending" };
}

/** Interprète une réponse libre; ne remplit jamais ce qui n'est pas dit. */
export function interpretContractorPreferences(raw: string): InterpretedPreferences {
  let text = ` ${String(raw ?? "").replace(/\s+/g, " ").trim()} `;
  const rules: TerritoryRule[] = [];
  const clarifications: PreferenceClarification[] = [];
  const cut = (m: string) => { text = text.replace(m, " "); };

  // 1. Temps de route (avant le rayon : « 30 minutes » n'est pas une distance).
  for (const m of [...text.matchAll(TRAVEL)]) {
    const n = Number(m[1]);
    const minutes = /^h/i.test(m[2]) ? n * 60 : n;
    rules.push(rule({ kind: "travel_time", include: true, travel_minutes: minutes, ...(m[3] ? { place: m[3].trim(), province: "QC", province_source: "default_quebec" } : {}), raw: m[0].trim() }));
    cut(m[0]);
  }

  // 2. Rayon géographique : exige un nombre suivi d'une unité ou d'un « autour de ».
  for (const m of [...text.matchAll(RADIUS)]) {
    const [whole, num, unitRaw, place] = m;
    const hasRadiusWord = /rayon|within|moins de|up to|radius/i.test(whole);
    if (!unitRaw && !place && !hasRadiusWord) continue;
    if (!unitRaw && !hasRadiusWord && !/autour|around/i.test(whole)) continue;
    const value = Number(num.replace(",", "."));
    const unit = unitRaw ? (/^mi/i.test(unitRaw) ? "mi" : "km") : null;
    const center = place?.trim();
    if (!unit) clarifications.push({ kind: "radius_unit", raw: whole.trim(), value, ...(center ? { place: center } : {}) });
    else if (!center) clarifications.push({ kind: "radius_center", raw: whole.trim() });
    if (unit && center) {
      rules.push(rule({
        kind: "radius", include: true, place: center, province: "QC", province_source: "default_quebec",
        radius_value: value, radius_unit: unit, radius_km: unit === "mi" ? Math.round(value * 1.609344 * 10) / 10 : value,
        raw: whole.trim(),
      }));
    }
    cut(whole);
  }

  // 3. Secteurs exclus (priorité absolue).
  const excludedPlaces: string[] = [];
  for (const m of [...text.matchAll(AREA_EXCLUSION)]) {
    for (const p of placeList(m[1], m[2])) excludedPlaces.push(p);
    cut(m[0]);
  }

  // 4. Localités incluses nommées.
  const includedPlaces: string[] = [];
  for (const m of [...text.matchAll(LOCALITY)]) {
    for (const p of placeList(m[1], m[2])) includedPlaces.push(p);
    cut(m[0]);
  }
  for (const p of uniq(excludedPlaces)) rules.push(rule({ kind: "locality", include: false, place: p, raw: p }));
  for (const p of uniq(includedPlaces)) {
    if (excludedPlaces.some((x) => samePreference(x, p))) continue;
    rules.push(rule({ kind: "locality", include: true, place: p, raw: p }));
  }

  // 5. Travaux : segments positifs / négatifs, dans l'ordre de la phrase.
  const noRefused = NONE.test(text);
  if (noRefused) text = text.replace(NONE, " ");
  const offered: string[] = [];
  const refused: string[] = [];
  const marks: Array<{ at: number; len: number; neg: boolean }> = [];
  for (const m of text.matchAll(NEGATION)) marks.push({ at: m.index ?? 0, len: m[0].length, neg: true });
  for (const m of text.matchAll(POSITIVE_AGAIN)) marks.push({ at: m.index ?? 0, len: m[0].length, neg: false });
  marks.sort((a, b) => a.at - b.at);
  let cursor = 0;
  let negative = false;
  for (const mk of marks) {
    const seg = text.slice(cursor, mk.at);
    (negative ? refused : offered).push(...splitItems(seg));
    cursor = mk.at + mk.len;
    // « ni » prolonge une négation; un marqueur positif la termine.
    negative = mk.neg ? true : false;
  }
  (negative ? refused : offered).push(...splitItems(text.slice(cursor)));

  const refusedU = uniq(refused);
  return {
    offered: uniq(offered).filter((o) => !refusedU.some((r) => samePreference(o, r))),
    refused: refusedU,
    noRefused: noRefused && refusedU.length === 0,
    rules,
    clarifications,
    raw: String(raw ?? "").trim(),
  };
}

/** Correction ultérieure : la déclaration la plus récente l'emporte, exclusions d'abord. */
export function mergePreferences(prev: Pick<InterpretedPreferences, "offered" | "refused" | "rules" | "noRefused">, next: InterpretedPreferences): Pick<InterpretedPreferences, "offered" | "refused" | "rules" | "noRefused"> {
  const refused = uniq([...prev.refused.filter((r) => !next.offered.some((o) => samePreference(o, r))), ...next.refused]);
  const offered = uniq([...prev.offered, ...next.offered]).filter((o) => !refused.some((r) => samePreference(o, r)));
  const key = (r: TerritoryRule) => `${r.kind}|${norm(r.place ?? "")}`;
  const rules = [...prev.rules.filter((r) => !next.rules.some((n) => key(n) === key(r) || (n.place && r.place && samePreference(n.place, r.place)))), ...next.rules];
  return { offered, refused, rules, noRefused: refused.length === 0 && (next.noRefused || (prev.noRefused && !next.refused.length)) };
}

/** Libellé humain d'une règle (aucune ville couverte inventée). */
export function territoryRuleLabel(r: TerritoryRule, lang: "fr" | "en" = "fr"): string {
  const place = r.place ? `${r.place}${r.province === "QC" ? (lang === "fr" ? " (Québec)" : " (Quebec)") : ""}` : "";
  if (r.kind === "radius") {
    const v = `${String(r.radius_value).replace(".", lang === "fr" ? "," : ".")} ${r.radius_unit}`;
    return lang === "fr" ? `Rayon de ${v} autour de ${place}` : `${v} radius around ${place}`;
  }
  if (r.kind === "travel_time") {
    return lang === "fr" ? `${r.travel_minutes} min de route${place ? ` de ${place}` : ""} (temps de route, pas un rayon)` : `${r.travel_minutes} min drive${place ? ` from ${place}` : ""} (drive time, not a radius)`;
  }
  return r.include ? place : (lang === "fr" ? `Sauf ${place}` : `Except ${place}`);
}

export function clarificationQuestion(c: PreferenceClarification, lang: "fr" | "en" = "fr"): string {
  if (c.kind === "radius_center") return lang === "fr" ? "Autour de quelle ville ou adresse se mesure ce rayon?" : "Which city or address is this radius measured from?";
  return lang === "fr"
    ? `« ${c.value} » : s'agit-il de kilomètres, de milles ou de minutes de route${c.place ? ` autour de ${c.place}` : ""}?`
    : `“${c.value}”: kilometres, miles or minutes of driving${c.place ? ` around ${c.place}` : ""}?`;
}
