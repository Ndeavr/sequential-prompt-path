import { describe, expect, it } from "vitest";
import {
  evaluateServiceTerritory,
  type ContractorServiceTerritory,
  type VerifiedServiceAddress,
  type VerifiedDrivingRoute,
} from "./roadServiceTerritories";

const NOW = Date.parse("2026-11-09T23:00:00.000Z");
const address: VerifiedServiceAddress = {
  locationId: "verified-house-1",
  municipalityId: "qc:trois-rivieres",
  districtIds: ["qc:trois-rivieres:cap-de-la-madeleine"],
  customAreaIds: ["custom:industrial-park-east"],
  verifiedAddress: true,
  verifiedAreas: true,
};
const route = (minutes: number, kilometers: number, patch: Partial<VerifiedDrivingRoute> = {}): VerifiedDrivingRoute => ({
  originLocationId: "hub:trois-rivieres",
  destinationLocationId: "verified-house-1",
  mode: "DRIVING",
  drivingMinutes: minutes,
  roadDistanceMeters: kilometers * 1000,
  provider: "google_routes",
  measuredAt: new Date(NOW - 90_000).toISOString(),
  trustedProviderResult: true,
  ...patch,
});
const policy = (zones: ContractorServiceTerritory["zones"]): ContractorServiceTerritory =>
  ({ contractorId: "contractor-trois-rivieres", zones });
const oneHour = {
  id: "tr:60-road-min",
  kind: "road_minutes" as const,
  include: true,
  hubLocationId: "hub:trois-rivieres",
  maxMinutes: 60,
};
const check = (
  zones: ContractorServiceTerritory["zones"],
  routes: readonly VerifiedDrivingRoute[] = [],
  place: VerifiedServiceAddress | null = address,
  service = "renovation",
) => evaluateServiceTerritory(policy(zones), service, place, routes, { nowMs: NOW });

describe("Territoires UNPRO — trajets routiers vérifiés, pas de vol d'oiseau", () => {
  it("accepte 55 minutes de route autour de Trois-Rivières", () => {
    const result = check([oneHour], [route(55, 67)]);
    expect(result).toMatchObject({ status: "covered", eligible: true, matchedZoneIds: ["tr:60-road-min"] });
  });

  it("refuse 65 minutes de route même si l'adresse est proche à vol d'oiseau", () => {
    expect(check([oneHour], [route(65, 35)]).status).toBe("outside_territory");
  });

  it("ne convertit jamais un rayon de route exprimé en km en haversine", () => {
    const fortyKm = { id: "road-40km", kind: "road_kilometers" as const, include: true,
      hubLocationId: "hub:trois-rivieres", maxKilometers: 40 };
    expect(check([fortyKm], [route(30, 46)]).status).toBe("outside_territory");
    expect(check([fortyKm], [route(35, 38)]).status).toBe("covered");
  });

  it("bloque les durées manquantes : géocodage seul ne prouve pas un trajet", () => {
    const x = check([oneHour], []);
    expect(x).toMatchObject({ status: "needs_route", eligible: false, pendingRouteZoneIds: ["tr:60-road-min"] });
  });

  it("rejette comme preuve une route non authentifiée, à pied, périmée ou pour une autre adresse", () => {
    for (const evidence of [
      route(20, 10, { trustedProviderResult: false }),
      route(20, 10, { mode: "DRIVING", measuredAt: new Date(NOW - 86_400_000).toISOString() }),
      route(20, 10, { destinationLocationId: "different-house" }),
      route(-10, 12),
      route(10, -3),
      route(Number.NaN, 4),
    ]) expect(check([oneHour], [evidence]).status).toBe("needs_route");
  });

  it("dessert une ville complète lorsque la municipalité est vérifiée", () => {
    const city = { id: "whole-city", kind: "municipality" as const, include: true, municipalityId: "qc:trois-rivieres" };
    expect(check([city]).status).toBe("covered");
    expect(check([city], [], { ...address, municipalityId: "qc:shawinigan" }).status).toBe("outside_territory");
  });

  it("dessert seulement une partie de la ville si le district précis est confirmé", () => {
    const district = { id: "secteur-cap", kind: "district" as const, include: true,
      municipalityId: "qc:trois-rivieres", districtId: "qc:trois-rivieres:cap-de-la-madeleine" };
    expect(check([district]).status).toBe("covered");
    expect(check([district], [], { ...address, districtIds: [] }).status).toBe("outside_territory");
    expect(check([district], [], { ...address, verifiedAreas: false }).status).toBe("needs_address");
  });

  it("accepte une zone polygonale validée, sans calculer de rayon euclidien", () => {
    const zone = { id: "poly-1", kind: "custom_area" as const, include: true, areaId: "custom:industrial-park-east" };
    expect(check([zone]).status).toBe("covered");
    expect(check([zone], [], { ...address, customAreaIds: [] }).status).toBe("outside_territory");
  });

  it("applique une zone de service propre au métier, pas aux autres professionnels", () => {
    const city = { id: "for-plumbers", kind: "municipality" as const, include: true,
      municipalityId: "qc:trois-rivieres", serviceCodes: ["plomberie"] };
    expect(check([city], [], address, "plomberie").status).toBe("covered");
    expect(check([city], [], address, "peinture").status).toBe("not_configured");
  });

  it("les zones exclues priment sur une ville entière acceptée", () => {
    const zones = [
      { id: "city", kind: "municipality" as const, include: true, municipalityId: "qc:trois-rivieres" },
      { id: "avoid-this-district", kind: "district" as const, include: false,
        municipalityId: "qc:trois-rivieres", districtId: "qc:trois-rivieres:cap-de-la-madeleine" },
    ];
    expect(check(zones).status).toBe("excluded");
  });

  it("une exclusion routière impossible à mesurer bloque une inclusion connue", () => {
    const zones = [
      { id: "city", kind: "municipality" as const, include: true, municipalityId: "qc:trois-rivieres" },
      { ...oneHour, id: "excluded-within-15", include: false, maxMinutes: 15 },
    ];
    expect(check(zones).status).toBe("needs_route");
    expect(check(zones, [route(12, 20)]).status).toBe("excluded");
    expect(check(zones, [route(35, 42)]).status).toBe("covered");
  });

  it("supporte une union de plusieurs villes et secteurs disjoints", () => {
    const zones = [
      { id: "city", kind: "municipality" as const, include: true, municipalityId: "qc:shawinigan" },
      { id: "sector", kind: "district" as const, include: true,
        municipalityId: "qc:trois-rivieres", districtId: "qc:trois-rivieres:cap-de-la-madeleine" },
    ];
    expect(check(zones).status).toBe("covered");
  });

  it("une adresse ambiguë ne devient jamais automatiquement éligible", () => {
    expect(check([oneHour], [route(20, 12)], { ...address, verifiedAddress: false }).status).toBe("needs_address");
    expect(check([], [route(20, 12)]).status).toBe("not_configured");
    expect(check([oneHour], [route(20, 12)], null).status).toBe("needs_address");
  });
});
