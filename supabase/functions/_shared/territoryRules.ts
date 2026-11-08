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

/** Verdict pour une adresse de propriétaire (ville + coordonnées facultatives). */
export function territoryVerdict(rules: StoredTerritoryRule[], lead: { city?: string | null; lat?: number | null; lng?: number | null }): { verdict: TerritoryVerdict; reason: string } {
  const city = norm(lead.city);
  const hasPoint = typeof lead.lat === "number" && typeof lead.lng === "number" && Number.isFinite(lead.lat) && Number.isFinite(lead.lng);
  // 1) Exclusions d'abord.
  for (const r of rules) {
    if (r.include) continue;
    if (r.kind === "locality" && city && norm(r.place) === city) return { verdict: "excluded", reason: "Territoire exclu par l'entrepreneur" };
    if (r.kind === "radius" && r.center && hasPoint && typeof r.radius_km === "number" && haversineKm(r.center, { lat: lead.lat as number, lng: lead.lng as number }) <= r.radius_km) {
      return { verdict: "excluded", reason: "Territoire exclu par l'entrepreneur" };
    }
  }
  // 2) Inclusions prouvables.
  for (const r of rules) {
    if (!r.include) continue;
    if (r.kind === "locality" && city && norm(r.place) === city) return { verdict: "covered", reason: "Localité déclarée par l'entrepreneur" };
    if (r.kind === "radius" && r.geocode_status === "geocoded" && r.center && hasPoint && typeof r.radius_km === "number" && r.radius_km > 0) {
      const d = haversineKm(r.center, { lat: lead.lat as number, lng: lead.lng as number });
      if (d <= r.radius_km) return { verdict: "covered", reason: `Centre de la ville dans le rayon déclaré de ${Math.round(r.radius_km)} km` };
    }
  }
  return { verdict: "unknown", reason: "Couverture non établie" };
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

export interface GeocodeHit { lat: number; lng: number; place_id?: string; formatted?: string; types?: string[]; province?: string | null }

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
