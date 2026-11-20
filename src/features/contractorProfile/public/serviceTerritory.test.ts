import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  clampTerritoryZoom,
  googleMapsCityUrl,
  locateCities,
  territoryCities,
  territoryViewport,
  TERRITORY_MAX_ZOOM,
  TERRITORY_MIN_ZOOM,
} from "./serviceTerritory";

// Snapshot of the 13 ISR service-area rows (contractor_service_areas) and the
// six matching rows that exist in the public `cities` reference table.
const ISR_AREAS = [
  ["Laval", "laval", true], ["Blainville", "blainville"], ["Boisbriand", "boisbriand"], ["Joliette", "joliette"],
  ["Mascouche", "mascouche"], ["Mirabel", "mirabel"], ["Montréal", "montreal"], ["Repentigny", "repentigny"],
  ["Rosemère", "rosemere"], ["Saint-Eustache", "saint-eustache"], ["Saint-Jérôme", "saint-jerome"],
  ["Sainte-Thérèse", "sainte-therese"], ["Terrebonne", "terrebonne"],
].map(([city_name, city_slug, is_primary]) => ({ city_name: city_name as string, city_slug: city_slug as string, is_primary: !!is_primary }));
const CITY_ROWS = [
  { slug: "blainville", latitude: 45.6645, longitude: -73.8783 },
  { slug: "laval", latitude: 45.6066, longitude: -73.7124 },
  { slug: "mirabel", latitude: 45.6502, longitude: -74.0831 },
  { slug: "montreal", latitude: 45.5017, longitude: -73.5673 },
  { slug: "repentigny", latitude: 45.7422, longitude: -73.4604 },
  { slug: "terrebonne", latitude: 45.6963, longitude: -73.6328 },
];

describe("public territory map framing", () => {
  it("ISR: keeps all 13 cities, pins only the 6 with a reference position, frames the Laval/Rive-Nord region", () => {
    const cities = territoryCities(ISR_AREAS);
    expect(cities).toHaveLength(13);
    expect(cities[0]).toMatchObject({ name: "Laval", primary: true });
    const { points, unlocated } = locateCities(cities, CITY_ROWS);
    expect(points.map((p) => p.slug).sort()).toEqual(["blainville", "laval", "mirabel", "montreal", "repentigny", "terrebonne"]);
    expect(unlocated.map((c) => c.slug)).toContain("joliette");
    expect(territoryViewport(points)).toEqual({ kind: "bounds", south: 45.5017, west: -74.0831, north: 45.7422, east: -73.4604 });
  });

  it("one city: centres on it at a regional zoom", () => {
    const cities = territoryCities([], "Montréal");
    const { points } = locateCities(cities, CITY_ROWS);
    expect(territoryViewport(points)).toEqual({ kind: "center", center: { lat: 45.5017, lng: -73.5673 }, zoom: 10 });
  });

  it("no city or no reliable position: no map at all (never a world view)", () => {
    expect(territoryCities([], null)).toEqual([]);
    expect(territoryViewport([])).toBeNull();
    const { points, unlocated } = locateCities(territoryCities([{ city_name: "Joliette" }]), [{ slug: "joliette", latitude: 0, longitude: 0 }]);
    expect(points).toEqual([]);
    expect(unlocated).toHaveLength(1);
  });

  it("clamps zoom so the map never falls back to zoom 0", () => {
    expect(clampTerritoryZoom(0)).toBe(TERRITORY_MIN_ZOOM);
    expect(clampTerritoryZoom(18)).toBe(TERRITORY_MAX_ZOOM);
    expect(clampTerritoryZoom(undefined)).toBe(10);
  });

  it("external link targets a public city, not an address", () => {
    expect(googleMapsCityUrl("Laval")).toBe("https://www.google.com/maps/search/?api=1&query=Laval%2C%20QC");
  });

  it("the public profile no longer uses the unsupported place_id embed", () => {
    const src = readFileSync("src/features/contractorProfile/public/ContractorPublicExperience.tsx", "utf8");
    expect(src).not.toContain("output=embed");
    expect(src).toContain("ServiceTerritoryMap");
  });
});
