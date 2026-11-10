/**
 * UNPRO — road-only contractor service territories.
 *
 * General-purpose, pure policy engine for Clara matching AND booking.
 * Every distance/time criterion uses a verified DRIVING route, never a
 * straight-line/haversine approximation. Administrative membership is a
 * separate geographic membership check, NOT a distance calculation.
 *
 * Important: proofs come from trusted server-side geocoding and routing.
 * A client-provided "verified" flag MUST NOT be accepted as verification.
 * A missing measurement cannot establish coverage or remove an exclusion.
 *
 * This is a staging module; connecting real routing provider data and
 * replacing legacy territoryRules.ts must happen together and be tested
 * before enabling in production.
 */

export type ContractorTerritoryZone =
  | {
      id: string;
      kind: "road_minutes";
      include: boolean;
      /** Verified geocoded origin, e.g. hub in Trois-Rivières. */
      hubLocationId: string;
      maxMinutes: number;
      serviceCodes?: readonly string[];
    }
  | {
      id: string;
      kind: "road_kilometers";
      include: boolean;
      hubLocationId: string;
      maxKilometers: number;
      serviceCodes?: readonly string[];
    }
  | {
      id: string;
      kind: "municipality";
      include: boolean;
      /** Stable municipality identifier from trusted address geocoding. */
      municipalityId: string;
      serviceCodes?: readonly string[];
    }
  | {
      id: string;
      kind: "district";
      include: boolean;
      municipalityId: string;
      /** Verified borough, neighborhood or city-sector identifier. */
      districtId: string;
      serviceCodes?: readonly string[];
    }
  | {
      id: string;
      kind: "custom_area";
      include: boolean;
      /** Verified polygon/sector membership from a server-side area lookup. */
      areaId: string;
      serviceCodes?: readonly string[];
    };

export interface VerifiedServiceAddress {
  /** Stable point/place identifier for the actual property, not the city centre. */
  locationId: string;
  municipalityId: string | null;
  /** Exact district memberships; do not invent these from a municipality. */
  districtIds: readonly string[];
  /** Set of server-confirmed polygon memberships. */
  customAreaIds: readonly string[];
  /** Trusted address-level geocoding succeeded, including areal hierarchy. */
  verifiedAddress: boolean;
  /** The authoritative geocoder resolved full city/subcity memberships. */
  verifiedAreas: boolean;
}

export interface VerifiedDrivingRoute {
  originLocationId: string;
  destinationLocationId: string;
  mode: "DRIVING";
  /** Road provider duration, not a haversine/Euclidean estimate. */
  drivingMinutes: number;
  /** Road provider distance along the road network, in meters. */
  roadDistanceMeters: number;
  provider: "google_routes" | "mapbox_directions" | "other_verified_routes";
  /** Timestamp of the trusted server-side route observation. */
  measuredAt: string;
  /** True only when verified inside a trusted server adapter. */
  trustedProviderResult: boolean;
}

export interface ContractorServiceTerritory {
  contractorId: string;
  zones: readonly ContractorTerritoryZone[];
}

export type ServiceTerritoryStatus =
  | "covered"
  | "outside_territory"
  | "excluded"
  | "needs_route"
  | "needs_address"
  | "not_configured";

export interface ServiceTerritoryResult {
  status: ServiceTerritoryStatus;
  /** Can be used to offer a booking ONLY after all other hard gates pass. */
  eligible: boolean;
  matchedZoneIds: string[];
  /** Service area rules awaiting trusted route evidence (no fallback to crow-distance). */
  pendingRouteZoneIds: string[];
  /** No driving route value is implied by a locality or district match. */
  message: string;
}

const validNonnegative = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v) && v >= 0;

function validRoute(
  route: VerifiedDrivingRoute,
  destinationId: string,
  nowMs: number,
  maxEvidenceAgeMs: number,
): boolean {
  const measured = Date.parse(route.measuredAt);
  return route.trustedProviderResult === true &&
    route.mode === "DRIVING" &&
    route.destinationLocationId === destinationId &&
    typeof route.originLocationId === "string" && !!route.originLocationId &&
    validNonnegative(route.drivingMinutes) &&
    validNonnegative(route.roadDistanceMeters) &&
    Number.isFinite(measured) &&
    measured <= nowMs + 60_000 &&
    nowMs - measured <= maxEvidenceAgeMs;
}

type RuleEvaluation = "matches" | "misses" | "needs_route" | "needs_address";

function evaluateZone(
  rule: ContractorTerritoryZone,
  address: VerifiedServiceAddress,
  routes: readonly VerifiedDrivingRoute[],
  nowMs: number,
  maxEvidenceAgeMs: number,
): RuleEvaluation {
  if (!address.verifiedAddress || !address.locationId) return "needs_address";

  switch (rule.kind) {
    case "municipality":
      if (!address.verifiedAreas) return "needs_address";
      return rule.municipalityId === address.municipalityId ? "matches" : "misses";
    case "district":
      if (!address.verifiedAreas) return "needs_address";
      return rule.municipalityId === address.municipalityId &&
        address.districtIds.includes(rule.districtId) ? "matches" : "misses";
    case "custom_area":
      if (!address.verifiedAreas) return "needs_address";
      return address.customAreaIds.includes(rule.areaId) ? "matches" : "misses";
    case "road_minutes":
    case "road_kilometers": {
      if (!rule.hubLocationId ||
        !validNonnegative(rule.kind === "road_minutes" ? rule.maxMinutes : rule.maxKilometers)) {
        return "needs_route";
      }
      const evidence = routes.find((r) =>
        r.originLocationId === rule.hubLocationId &&
        validRoute(r, address.locationId, nowMs, maxEvidenceAgeMs));
      if (!evidence) return "needs_route";
      return (rule.kind === "road_minutes"
        ? evidence.drivingMinutes <= rule.maxMinutes
        : evidence.roadDistanceMeters <= rule.maxKilometers * 1000)
          ? "matches" : "misses";
    }
  }
}

export interface TerritoryEvaluationOptions {
  /** Server clock, injectable only for deterministic unit tests. */
  nowMs?: number;
  /** Max age of verified routing evidence. Default 60 min. */
  maxEvidenceAgeMs?: number;
}

/**
 * Exclusions override inclusions. Unknown exclusions fail closed so an
 * unmeasured excluded area cannot be silently advertised as bookable.
 * Multiple included cities/districts/road ranges use OR semantics.
 */
export function evaluateServiceTerritory(
  territory: ContractorServiceTerritory,
  serviceCode: string,
  address: VerifiedServiceAddress | null,
  routes: readonly VerifiedDrivingRoute[],
  opts: TerritoryEvaluationOptions = {},
): ServiceTerritoryResult {
  const scoped = territory.zones.filter((z) =>
    !z.serviceCodes || z.serviceCodes.includes(serviceCode));
  const outcome = (status: ServiceTerritoryStatus, matched: string[], pending: string[]): ServiceTerritoryResult => ({
    status,
    eligible: status === "covered",
    matchedZoneIds: matched,
    pendingRouteZoneIds: pending,
    message: ({
      covered: "Territoire déclaré couvert, sous réserve des autres vérifications.",
      excluded: "Secteur expressément exclu par l’entrepreneur.",
      outside_territory: "Cette adresse n’est pas dans le territoire déclaré.",
      needs_route: "Temps ou distance de route à vérifier avant de confirmer le territoire.",
      needs_address: "Adresse et secteur précis à confirmer.",
      not_configured: "Aucun territoire confirmé pour ce service.",
    })[status],
  });
  if (!scoped.length) return outcome("not_configured", [], []);
  if (!address?.verifiedAddress || !address.locationId) return outcome("needs_address", [], []);

  const now = opts.nowMs ?? Date.now();
  const age = opts.maxEvidenceAgeMs ?? 3_600_000;
  const results = scoped.map((z) => ({
    rule: z,
    evaluation: evaluateZone(z, address, routes, now, age),
  }));

  const exclusions = results.filter((x) => !x.rule.include);
  const matchedExclusion = exclusions.find((x) => x.evaluation === "matches");
  if (matchedExclusion) return outcome("excluded", [matchedExclusion.rule.id], []);
  const uncertainExclusions = exclusions.filter((x) =>
    x.evaluation === "needs_address" || x.evaluation === "needs_route");
  if (uncertainExclusions.length) {
    const pending = uncertainExclusions.filter((x) =>
      x.evaluation === "needs_route").map((x) => x.rule.id);
    return outcome(uncertainExclusions.some((x) => x.evaluation === "needs_address")
      ? "needs_address" : "needs_route", [], pending);
  }

  const inclusions = results.filter((x) => x.rule.include);
  if (!inclusions.length) return outcome("not_configured", [], []);
  const matched = inclusions.filter((x) => x.evaluation === "matches");
  if (matched.length) return outcome("covered", matched.map((x) => x.rule.id), []);
  const pending = inclusions.filter((x) => x.evaluation === "needs_route").map((x) => x.rule.id);
  if (results.some((x) => x.rule.include && x.evaluation === "needs_address")) {
    return outcome("needs_address", [], pending);
  }
  if (pending.length) return outcome("needs_route", [], pending);
  return outcome("outside_territory", [], []);
}
