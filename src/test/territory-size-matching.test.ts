import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { carryGeocodedCenters, geocodePendingRules, haversineKm, territoryVerdict, type StoredTerritoryRule } from "../../supabase/functions/_shared/territoryRules";
import { projectSizeFit } from "../../supabase/functions/_shared/projectSizeFit";

const LAVAL = { lat: 45.5697, lng: -73.692 };
const radius = (o: Partial<StoredTerritoryRule> = {}): StoredTerritoryRule => ({ kind: "radius", include: true, place: "Laval", radius_km: 30, geocode_status: "geocoded", center: { ...LAVAL, source: "google_places" }, ...o });

describe("territoires déclarés : exclusion prioritaire, rien d'inventé", () => {
  it("exclusion de localité l'emporte sur un rayon qui la couvre", () => {
    const rules = [radius(), { kind: "locality", include: false, place: "Montréal" } as StoredTerritoryRule];
    expect(territoryVerdict(rules, { city: "montreal", lat: 45.5019, lng: -73.5674 }).verdict).toBe("excluded");
  });
  it("rayon géocodé + coordonnées de la ville : couvert; hors rayon : inconnu", () => {
    expect(territoryVerdict([radius()], { city: "Montréal", lat: 45.5019, lng: -73.5674 }).verdict).toBe("covered");
    expect(territoryVerdict([radius()], { city: "Québec", lat: 46.8139, lng: -71.208 }).verdict).toBe("unknown");
  });
  it("sans coordonnées, centre ambigu ou temps de route : aucune couverture présumée", () => {
    expect(territoryVerdict([radius()], { city: "Montréal" }).verdict).toBe("unknown");
    expect(territoryVerdict([radius({ geocode_status: "ambiguous" })], { city: "Montréal", lat: 45.5, lng: -73.57 }).verdict).toBe("unknown");
    expect(territoryVerdict([{ kind: "travel_time", include: true, place: "Laval", travel_minutes: 45 }], { city: "Laval", lat: LAVAL.lat, lng: LAVAL.lng }).verdict).toBe("unknown");
  });
  it("géocodage : un seul résultat-localité = géocodé; plusieurs = ambigu; panne = indisponible", async () => {
    const one = await geocodePendingRules([radius({ geocode_status: "pending", center: undefined })], async () => [{ ...LAVAL, types: ["locality"], province: "QC" }]);
    expect(one[0].geocode_status).toBe("geocoded");
    const two = await geocodePendingRules([radius({ geocode_status: "pending", center: undefined })], async () => [{ ...LAVAL, types: ["locality"] }, { lat: 1, lng: 1, types: ["locality"] }]);
    expect(two[0].geocode_status).toBe("ambiguous");
    const down = await geocodePendingRules([radius({ geocode_status: "pending", center: undefined })], async () => null);
    expect(down[0].geocode_status).toBe("unavailable");
    expect(down[0].center).toBeUndefined();
  });
  it("centre déjà géocodé réutilisé à la sauvegarde suivante", () => {
    const out = carryGeocodedCenters([radius({ geocode_status: "pending", center: undefined })], [radius()]);
    expect(out[0].center?.lat).toBe(LAVAL.lat);
  });
  it("distance Laval–Montréal (centres) ≈ 12 km", () => expect(Math.round(haversineKm(LAVAL, { lat: 45.5019, lng: -73.5674 }))).toBe(12));
  it("le jumelage consomme ces règles et les tailles déclarées", () => {
    const src = readFileSync("supabase/functions/match-lead/index.ts", "utf8");
    expect(src).toContain("territoryVerdict(");
    expect(src).toContain('territory.verdict === "excluded"');
    expect(src).toContain("projectSizeFit(");
  });
});

describe("tailles de projet déclarées dans le jumelage", () => {
  const sizes = [
    { code: "small", stance: "refused" as const, minValue: 0, maxValue: 5000 },
    { code: "medium", stance: "accepted" as const, minValue: 5000, maxValue: 25000 },
    { code: "large", stance: "preferred" as const, minValue: 25000, maxValue: null },
  ];
  it("budget entièrement dans une taille refusée : exclu", () => expect(projectSizeFit(sizes, { min: 1000, max: 3000 }).fit).toBe("refused"));
  it("budget qui recoupe une taille acceptée : jamais exclu", () => expect(projectSizeFit(sizes, { min: 3000, max: 8000 }).fit).toBe("neutral"));
  it("taille recherchée : bonus", () => expect(projectSizeFit(sizes, { max: 40000 }).fit).toBe("preferred"));
  it("aucune fourchette déclarée ou budget inconnu : neutre (aucune fourchette universelle)", () => {
    expect(projectSizeFit([{ code: "small", stance: "refused" }], { max: 1000 }).fit).toBe("neutral");
    expect(projectSizeFit(sizes, {}).fit).toBe("neutral");
  });
});
