/**
 * Règles de territoire déclarées par l'entrepreneur (matching-profile
 * `answers.territory_rules`), réutilisables par le jumelage et la réservation.
 *
 * - Exclusion prioritaire : une localité exclue n'est jamais desservie.
 * - Rayon GÉOGRAPHIQUE (à vol d'oiseau) seulement quand le centre est géocodé
 *   sans ambiguïté ET que l'adresse du propriétaire a des coordonnées.
 * - Temps de route : jamais converti en kilomètres; aucune couverture inventée.
 * - Sans preuve suffisante → « unknown » : aucune disponibilité affirmée.
 */
export type TerritoryRuleKind = "radius" | "locality" | "travel_time";

export interface StoredTerritoryRule {
  kind: TerritoryRuleKind;
  include: boolean;
  place?: string;
  province?: string;
  radius_km?: number;
  travel_minutes?: number;
  raw?: string;
  geocode_status?: "pending" | "geocoded" | "ambiguous" | "not_found" | "unavailable";
  center?: { lat: number; lng: number; place_id?: string; formatted?: string; source: "google_places" };
}

export type TerritoryVerdict = "excluded" | "covered" | "unknown";

const norm = (s: unknown) =>
  String(s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/^(ville de |city of )/, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371.0088;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function readTerritoryRules(answers: unknown): StoredTerritoryRule[] {
  const list = (answers as { territory_rules?: unknown } | null | undefined)?.territory_rules;
  return Array.isArray(list) ? (list.filter((r) => r && typeof r === "object" && typeof (r as StoredTerritoryRule).kind === "string") as StoredTerritoryRule[]) : [];
}

/**
 * Position du propriétaire. Seules des coordonnées d'ADRESSE (fiche propriété
 * ou adresse géocodée sans ambiguïté) peuvent établir un rayon : le centre
 * d'une ville ne prouve jamais qu'une adresse est à moins de X km.
 */
export type PointAccuracy = "property_coordinates" | "geocoded_address";
export interface HomeownerLocation {
  city?: string | null;
  neighborhood?: string | null;
  point?: { lat: number; lng: number; accuracy: PointAccuracy } | null;
  /**
   * Noms de la hiérarchie de l'ADRESSE (municipalité, arrondissement, quartier)
   * tirés d'un géocodage exact. Présents = l'appartenance à un quartier est connue.
   */
  areas?: string[] | null;
}
export interface TerritoryResult { verdict: TerritoryVerdict; reason: string; exclusionUncertain?: true; distanceKm?: number }

const km = (n: number) => new Intl.NumberFormat("fr-CA", { maximumFractionDigits: 1 }).format(n);

/** Règles effectives : exclusions toujours; inclusions seulement une fois les préférences confirmées. */
export function effectiveTerritoryRules(answers: unknown): StoredTerritoryRule[] {
  const confirmed = (answers as Record<string, unknown> | null | undefined)?.preferences_confirmed === true;
  return readTerritoryRules(answers).filter((r) => !r.include || confirmed || (r as { confirmed?: boolean }).confirmed === true);
}

/** Verdict pour une adresse de propriétaire (jumelage ET réservation). */
export function territoryVerdict(rules: StoredTerritoryRule[], loc: HomeownerLocation): TerritoryResult {
  const places = [norm(loc.city), norm(loc.neighborhood), ...(loc.areas ?? []).map(norm)].filter(Boolean);
  const p = loc.point && Number.isFinite(loc.point.lat) && Number.isFinite(loc.point.lng)
    && (loc.point.accuracy === "property_coordinates" || loc.point.accuracy === "geocoded_address") ? loc.point : null;
  const inPlace = (r: StoredTerritoryRule) => !!r.place && places.includes(norm(r.place));
  const subAreaKnown = subAreaResolved(loc);
  let uncertain = false;
  // 1) Exclusions d'abord (ville ou quartier, puis rayon exclu).
  for (const r of rules) {
    if (r.include) continue;
    if ((r.kind === "locality" || r.kind === "radius" || r.kind === "travel_time") && inPlace(r)) return { verdict: "excluded", reason: "Territoire exclu par l'entrepreneur" };
    // Localité exclue qui ne correspond pas à la ville : ce peut être un quartier
    // de cette ville. Sans quartier connu de l'adresse, on ne peut pas l'écarter.
    if (r.kind === "locality" && r.place && !subAreaKnown) uncertain = true;
    if (r.kind === "radius") {
      if (r.geocode_status === "geocoded" && r.center && typeof r.radius_km === "number" && p) {
        if (haversineKm(r.center, p) <= r.radius_km) return { verdict: "excluded", reason: "Territoire exclu par l'entrepreneur" };
      } else {
        uncertain = true; // zone exclue impossible à vérifier sans adresse précise ou centre géocodé
      }
    }
    if (r.kind === "travel_time") uncertain = true; // jamais convertie en distance
  }
  if (uncertain) return { verdict: "unknown", exclusionUncertain: true, reason: "Adresse précise requise : une zone exclue pourrait la couvrir" };
  // 2) Inclusions prouvables.
  for (const r of rules) {
    if (!r.include) continue;
    if (r.kind === "locality" && inPlace(r)) return { verdict: "covered", reason: "Localité déclarée par l'entrepreneur" };
    if (r.kind === "radius" && r.geocode_status === "geocoded" && r.center && p && typeof r.radius_km === "number" && r.radius_km > 0) {
      const d = haversineKm(r.center, p);
      if (d <= r.radius_km) return { verdict: "covered", distanceKm: d, reason: `Adresse à ${km(d)} km du centre déclaré (rayon de ${km(r.radius_km)} km, à vol d'oiseau)` };
    }
  }
  return { verdict: "unknown", reason: "Couverture non établie" };
}

/** Quartier de l'adresse connu : champ de la fiche propriété ou hiérarchie d'un géocodage exact. */
export function subAreaResolved(loc: HomeownerLocation): boolean {
  return !!norm(loc.neighborhood) || (Array.isArray(loc.areas) && loc.areas.some((a) => !!norm(a)));
}

const ADDRESS_TYPES = new Set(["street_address", "premise", "subpremise"]);
const AREA_TYPES = new Set(["locality", "sublocality", "sublocality_level_1", "sublocality_level_2", "neighborhood", "administrative_area_level_3", "postal_town", "colloquial_area"]);

/** Masque Places (New) pour une adresse : position, types ET hiérarchie (quartier). */
export const ADDRESS_FIELD_MASK = "places.id,places.location,places.types,places.addressComponents";

/** Réponse Places (New) → résultats normalisés (aucun champ inventé). */
// deno-lint-ignore no-explicit-any
export function placesToHits(places: any[] | null | undefined): GeocodeHit[] {
  return (places ?? []).filter((x) => x?.location).map((x) => ({
    lat: Number(x.location.latitude), lng: Number(x.location.longitude), types: x.types ?? [],
    // deno-lint-ignore no-explicit-any
    components: Array.isArray(x.addressComponents) ? x.addressComponents.map((c: any) => ({
      long: typeof c?.longText === "string" ? c.longText : null,
      short: typeof c?.shortText === "string" ? c.shortText : null,
      types: Array.isArray(c?.types) ? c.types : [],
    })) : undefined,
  }));
}

/**
 * Un seul résultat de niveau adresse = coordonnées + hiérarchie utilisables;
 * zéro ou plusieurs = rien (aucune précision supposée).
 */
export function pickAddressHit(hits: GeocodeHit[] | null | undefined): { point: { lat: number; lng: number; accuracy: "geocoded_address" }; areas: string[] | null } | null {
  const addr = (hits ?? []).filter((h) => (h.types ?? []).some((t) => ADDRESS_TYPES.has(t)) && Number.isFinite(h.lat) && Number.isFinite(h.lng));
  if (addr.length !== 1) return null;
  const h = addr[0];
  const names = (h.components ?? []).filter((c) => (c.types ?? []).some((t) => AREA_TYPES.has(t)))
    .flatMap((c) => [c.long, c.short]).filter((s): s is string => typeof s === "string" && !!s.trim());
  return { point: { lat: h.lat, lng: h.lng, accuracy: "geocoded_address" }, areas: names.length ? [...new Set(names)] : null };
}

/** Compatibilité : coordonnées seules. */
export function pickAddressPoint(hits: GeocodeHit[] | null | undefined): { lat: number; lng: number; accuracy: "geocoded_address" } | null {
  return pickAddressHit(hits)?.point ?? null;
}

/** Faut-il géocoder l'adresse (rayon à mesurer OU quartier exclu à vérifier)? */
export function needsAddressDetail(rules: StoredTerritoryRule[], loc: HomeownerLocation): boolean {
  return (needsAddressPoint(rules) && !loc.point)
    || (!subAreaResolved(loc) && rules.some((r) => !r.include && r.kind === "locality" && !!r.place));
}

/** Coordonnées de la fiche propriété, si réelles. */
export function propertyPoint(prop: { latitude?: unknown; longitude?: unknown } | null | undefined): HomeownerLocation["point"] {
  const lat = Number(prop?.latitude), lng = Number(prop?.longitude);
  return prop && prop.latitude != null && prop.longitude != null && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180
    ? { lat, lng, accuracy: "property_coordinates" } : null;
}

/** Les règles exigent-elles une adresse précise pour conclure? */
export function needsAddressPoint(rules: StoredTerritoryRule[]): boolean {
  return rules.some((r) => r.kind === "radius" && r.geocode_status === "geocoded");
}

/**
 * Réservation : mêmes règles que le jumelage. Exclusion (ou exclusion non
 * vérifiable) = refus. Territoire déclaré → couverture prouvée exigée.
 * Aucun territoire déclaré → comportement existant inchangé (aucune couverture inventée).
 */
export function bookingTerritoryDecision(rules: StoredTerritoryRule[], serviceAreaCities: Iterable<string>, loc: HomeownerLocation):
  { allowed: true; reason: string } | { allowed: false; code: "territory_excluded" | "territory_unverified" | "outside_declared_territory"; reason: string } {
  const t = territoryVerdict(rules, loc);
  if (t.verdict === "excluded") return { allowed: false, code: "territory_excluded", reason: t.reason };
  if (t.exclusionUncertain) return { allowed: false, code: "territory_unverified", reason: t.reason };
  const areas = [...serviceAreaCities].map(norm).filter(Boolean);
  if (t.verdict === "covered") return { allowed: true, reason: t.reason };
  if (areas.length && loc.city && areas.includes(norm(loc.city))) return { allowed: true, reason: "Zone de service explicite" };
  if (!rules.some((r) => r.include) && !areas.length) return { allowed: true, reason: "Aucun territoire déclaré" };
  return { allowed: false, code: "outside_declared_territory", reason: "Adresse hors du territoire déclaré ou non vérifiable" };
}

/** Réutilise un centre déjà géocodé pour la même règle (aucun appel inutile). */
export function carryGeocodedCenters(next: StoredTerritoryRule[], previous: StoredTerritoryRule[]): StoredTerritoryRule[] {
  const key = (r: StoredTerritoryRule) => [r.kind, r.include, norm(r.place), r.province ?? "QC"].join("|");
  const known = new Map(previous.filter((r) => r.center && r.geocode_status && r.geocode_status !== "pending").map((r) => [key(r), r]));
  return next.map((r) => {
    const k = known.get(key(r));
    return k && (!r.geocode_status || r.geocode_status === "pending") ? { ...r, geocode_status: k.geocode_status, center: k.center } : r;
  });
}

export interface GeocodeHit {
  lat: number; lng: number; place_id?: string; formatted?: string; types?: string[]; province?: string | null;
  components?: { long: string | null; short: string | null; types: string[] }[];
}

/**
 * Géocode les centres en attente (au plus `max`). Un seul résultat de type
 * localité dans la province présumée = géocodé; plusieurs = ambigu (question
 * ciblée), aucun = introuvable. Les autres champs déclarés ne changent jamais.
 */
export async function geocodePendingRules(
  rules: StoredTerritoryRule[],
  geocode: (query: string) => Promise<GeocodeHit[] | null>,
  max = 5,
): Promise<StoredTerritoryRule[]> {
  let budget = max;
  const out: StoredTerritoryRule[] = [];
  for (const r of rules) {
    if (r.kind !== "radius" || !r.place || (r.geocode_status && r.geocode_status !== "pending") || budget <= 0) { out.push(r); continue; }
    budget--;
    const province = r.province ?? "QC";
    const hits = await geocode(`${r.place}, ${province === "QC" ? "Québec" : province}, Canada`);
    if (hits === null) { out.push({ ...r, geocode_status: "unavailable" }); continue; }
    const localities = hits.filter((h) => (h.types ?? []).some((t) => t === "locality" || t === "sublocality" || t === "administrative_area_level_3" || t === "postal_town" || t === "neighborhood"))
      .filter((h) => !h.province || h.province === province);
    if (localities.length === 1) {
      const h = localities[0];
      out.push({ ...r, geocode_status: "geocoded", center: { lat: h.lat, lng: h.lng, place_id: h.place_id, formatted: h.formatted, source: "google_places" } });
    } else {
      out.push({ ...r, geocode_status: localities.length > 1 ? "ambiguous" : "not_found" });
    }
  }
  return out;
}
