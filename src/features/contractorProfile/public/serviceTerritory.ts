/**
 * Pure helpers for the public "Territoire" map.
 * Coordinates come only from the existing public `cities` reference table
 * (city centres). Never the business address, never invented positions.
 */
export type TerritoryArea = { city_name?: string | null; city_slug?: string | null; is_primary?: boolean | null };
export type CityCoordinateRow = { slug: string; latitude: number | null; longitude: number | null };
export type TerritoryPoint = { name: string; slug: string; lat: number; lng: number; primary: boolean };
export type TerritoryCity = { name: string; slug: string; primary: boolean };

export const TERRITORY_MIN_ZOOM = 7;
export const TERRITORY_MAX_ZOOM = 11;
export const TERRITORY_SINGLE_CITY_ZOOM = 10;

export function citySlug(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Rough Québec envelope: rejects 0,0, swapped or out-of-province values. */
export function isPlausibleQuebecPoint(lat: unknown, lng: unknown): lat is number {
  return typeof lat === "number" && typeof lng === "number" && Number.isFinite(lat) && Number.isFinite(lng)
    && lat >= 44.9 && lat <= 63 && lng >= -79.8 && lng <= -57;
}

/** Unique service cities, primary first, then the declared order. Falls back to the business city. */
export function territoryCities(areas: TerritoryArea[], fallbackCity?: string | null): TerritoryCity[] {
  const source: TerritoryArea[] = areas.length ? areas : fallbackCity ? [{ city_name: fallbackCity, is_primary: true }] : [];
  const seen = new Set<string>();
  const cities: TerritoryCity[] = [];
  for (const area of source) {
    const name = area.city_name?.trim();
    if (!name) continue;
    const slug = area.city_slug?.trim() || citySlug(name);
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    cities.push({ name, slug, primary: !!area.is_primary });
  }
  return cities.sort((a, b) => Number(b.primary) - Number(a.primary));
}

export function locateCities(cities: TerritoryCity[], rows: CityCoordinateRow[]) {
  const bySlug = new Map(rows.map((row) => [row.slug, row]));
  const points: TerritoryPoint[] = [];
  const unlocated: TerritoryCity[] = [];
  for (const city of cities) {
    const row = bySlug.get(city.slug);
    if (row && isPlausibleQuebecPoint(row.latitude, row.longitude)) {
      points.push({ ...city, lat: row.latitude as number, lng: row.longitude as number });
    } else {
      unlocated.push(city);
    }
  }
  return { points, unlocated };
}

export type TerritoryViewport =
  | { kind: "center"; center: { lat: number; lng: number }; zoom: number }
  | { kind: "bounds"; south: number; west: number; north: number; east: number };

/** null = nothing reliable to show → no map (never a world view). */
export function territoryViewport(points: TerritoryPoint[]): TerritoryViewport | null {
  if (!points.length) return null;
  if (points.length === 1) return { kind: "center", center: { lat: points[0].lat, lng: points[0].lng }, zoom: TERRITORY_SINGLE_CITY_ZOOM };
  return {
    kind: "bounds",
    south: Math.min(...points.map((p) => p.lat)),
    west: Math.min(...points.map((p) => p.lng)),
    north: Math.max(...points.map((p) => p.lat)),
    east: Math.max(...points.map((p) => p.lng)),
  };
}

export function clampTerritoryZoom(zoom: number | undefined): number {
  if (typeof zoom !== "number" || !Number.isFinite(zoom)) return TERRITORY_SINGLE_CITY_ZOOM;
  return Math.min(TERRITORY_MAX_ZOOM, Math.max(TERRITORY_MIN_ZOOM, zoom));
}

/** External Google Maps search for a public city name (never an address). */
export function googleMapsCityUrl(cityName: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${cityName}, QC`)}`;
}
