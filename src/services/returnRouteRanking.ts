/**
 * UNPRO — return-to-base route ranking.
 *
 * Pure and side-effect free. DOES NOT fetch routes, geocode, book an appointment,
 * or infer a travel time from distance. The caller supplies route-provider ETAs
 * for the expected departure times and only prevalidated bookable candidates.
 *
 * A normal appointment must help the representative return toward their
 * declared end-of-day base. A backward detour is offered only when there are no
 * other return-compatible options, as an explicit exception.
 *
 * This module ranks already-valid slots; the booking transaction remains the
 * ultimate authority for calendars, schedules, buffers, territories, capacity,
 * licensing and evening caps.
 */

export interface MeasuredInsertion {
  /** Opaque appointment candidate ID (no customer location or PII). */
  id: string;
  /** True only after the existing booking engine verified all hard constraints. */
  slotVerified: boolean;
  /** True only when route durations came from a permitted routing provider. */
  routeEtaVerified: boolean;
  /** Minutes from the last confirmed stop A to candidate stop C. */
  previousToCandidateMinutes: number | null;
  /** Minutes from candidate C to next confirmed stop B, or return base B. */
  candidateToNextMinutes: number | null;
  /** Minutes along the original A->B leg without candidate C. */
  previousToNextMinutes: number | null;
  /** Driving minutes from previous stop A to the day's declared return base. */
  previousToBaseMinutes: number | null;
  /** Driving minutes from candidate stop C to the same return base. */
  candidateToBaseMinutes: number | null;
  /** Whether B is the base rather than another booked appointment. */
  nextIsBase: boolean;
  /** Existing proven free-time gap, if known, used as a soft tie-breaker. */
  emptyTimeBeforeMinutes?: number | null;
  /**
   * Verified crossings of MAJOR water barriers (e.g. Montréal/Laval river
   * crossings) along each road leg. NOT a count of every highway overpass.
   * Must come from a trusted route geometry/barrier lookup, never municipality
   * names, air-line distance or assumptions about a bridge.
   */
  strategicBridgeCrossings?: {
    verified: boolean;
    previousToCandidate: number;
    candidateToNext: number;
    previousToNext: number;
  } | null;
}

export interface ReturnRouteRules {
  /** Desired driving time between consecutive appointments. Defaults to 20. */
  idealLegMinutes?: number;
  /** Maximum driving time BETWEEN visits, not the final commute home. Default 60. */
  maxLegMinutes?: number;
  /** Small traffic noise allowance before counting a destination as backward. */
  backwardToleranceMinutes?: number;
  /** Prefer staying on the same side until all nearby visits are done. Default true. */
  preferBridgeClusters?: boolean;
}

export interface RankedInsertion {
  id: string;
  detourMinutes: number;
  progressTowardBaseMinutes: number;
  minutesFromPrevious: number;
  minutesToNext: number;
  /** Lower means less itinerary cost. NOT a factual route measurement. */
  rankingCost: number;
  requiresExceptionConfirmation: boolean;
  /**
   * Additional major water crossings versus A→B without the added stop.
   * null means the bridge topology could not be independently verified.
   */
  additionalBridgeCrossings: number | null;
}

export type ReturnRoutePlan = {
  status: "return_path" | "exception_only" | "needs_route_eta" | "no_valid_slot";
  /** Safe to suggest routinely: these progress toward the return location. */
  options: RankedInsertion[];
  /** IDs never promoted as an ordinary route-compatible suggestion. */
  withheldBacktracks: string[];
  /** Extra cross-river backtracking withheld when better choices exist. */
  withheldBridgeDetours: string[];
  /** Slots with valid road ETA but unknown bridge topology (not asserted safe). */
  bridgeUnverified: string[];
  /** Bookable candidates missing a verified ETA. No route claims may be made. */
  etaUnverified: string[];
  /** Candidates already invalid or exceeding the hard inter-visit trip limit. */
  excluded: string[];
};

const validTime = (n: number | null | undefined): n is number =>
  typeof n === "number" && Number.isFinite(n) && n >= 0;

const normalizeLimit = (value: number | undefined, fallback: number): number =>
  validTime(value) ? value : fallback;

function additionalCrossings(c: MeasuredInsertion): number | null {
  const x = c.strategicBridgeCrossings;
  if (!x?.verified) return null;
  const counts = [x.previousToCandidate, x.candidateToNext, x.previousToNext];
  if (!counts.every((n) => Number.isSafeInteger(n) && n >= 0)) return null;
  return Math.max(0, x.previousToCandidate + x.candidateToNext - x.previousToNext);
}

/** Prefer zero additional verified bridge crossings. Use alternatives only when
 * no verified direct cluster remains; always mark extra crossings as exceptions.
 * Unknown bridge metadata cannot prove a same-side itinerary.
 */
function chooseBridgeCluster(
  items: RankedInsertion[],
  enabled: boolean,
): { options: RankedInsertion[]; withheld: string[] } {
  if (!enabled) return { options: items, withheld: [] };
  const noExtra = items.filter((x) => x.additionalBridgeCrossings === 0);
  const unverified = items.filter((x) => x.additionalBridgeCrossings === null);
  const extra = items.filter((x) =>
    x.additionalBridgeCrossings !== null && x.additionalBridgeCrossings > 0);
  if (noExtra.length) return {
    options: noExtra,
    withheld: extra.map((x) => x.id),
  };
  if (unverified.length) return {
    options: unverified,
    withheld: extra.map((x) => x.id),
  };
  return { options: extra, withheld: [] };
}

/**
 * Route-insertion policy:
 * - The existing booking engine MUST screen hard time/availability rules first.
 * - Use road ETAs, ideally traffic-aware at each expected departure time.
 * - Between visits cap both consecutive driving legs, but do not cap a
 *   representative's separate commute from the last visit to their base.
 * - If some candidates progress toward base, hold back all candidates that
 *   reverse direction; do not silently add them to the normal shortlist.
 * - If NO progressive option exists, offer the least-disruptive backward route
 *   only with an explicit "exception" flag and an informed decision.
 * - Never treat missing ETAs as evidence that a stop is on the return route.
 * - After a major river crossing, prefer visits on the SAME SIDE: a
 *   candidate causing two avoidable cross-river legs is withheld if another
 *   valid candidate avoids extra crossings. Back-and-forth trips are a last
 *   resort with explicit explanation.
 * - Strategic crossing counts must be validated from route geometry/curated
 *   barriers. City names alone never prove a river crossing.
 */
export function rankReturnRouteCandidates(
  candidates: readonly MeasuredInsertion[],
  preferences: ReturnRouteRules = {},
): ReturnRoutePlan {
  const ideal = normalizeLimit(preferences.idealLegMinutes, 20);
  const maximum = normalizeLimit(preferences.maxLegMinutes, 60);
  const tolerance = normalizeLimit(preferences.backwardToleranceMinutes, 0);
  const clusterBridges = preferences.preferBridgeClusters !== false;

  const progressive: RankedInsertion[] = [];
  const backwards: RankedInsertion[] = [];
  const etaUnverified: string[] = [];
  const excluded: string[] = [];
  const bridgeUnverified: string[] = [];

  for (const c of candidates) {
    if (!c.slotVerified) {
      excluded.push(c.id);
      continue;
    }

    const durations = [
      c.previousToCandidateMinutes,
      c.candidateToNextMinutes,
      c.previousToNextMinutes,
      c.previousToBaseMinutes,
      c.candidateToBaseMinutes,
    ];
    if (!c.routeEtaVerified || !durations.every(validTime)) {
      etaUnverified.push(c.id);
      continue;
    }

    const first = c.previousToCandidateMinutes as number;
    const second = c.candidateToNextMinutes as number;
    const original = c.previousToNextMinutes as number;
    const previousHome = c.previousToBaseMinutes as number;
    const candidateHome = c.candidateToBaseMinutes as number;

    // The 60-minute contractor preference is BETWEEN two appointments.
    // Returning from the final visit to home/base is not an inter-visit leg.
    if (first > maximum || (!c.nextIsBase && second > maximum)) {
      excluded.push(c.id);
      continue;
    }

    const progress = previousHome - candidateHome;
    const detour = first + second - original;
    const backwardsFromBase = progress < -tolerance;
    const idle = validTime(c.emptyTimeBeforeMinutes) ? c.emptyTimeBeforeMinutes : 0;
    const bridgeExtras = additionalCrossings(c);
    if (bridgeExtras === null) bridgeUnverified.push(c.id);

    // Soft ordering only, never an eligibility or travel-time guarantee.
    const rankingCost =
      2 * detour +
      0.75 * Math.max(0, first - ideal) +
      (c.nextIsBase ? 0 : 0.4 * Math.max(0, second - ideal)) +
      0.1 * idle -
      0.15 * progress;

    const item: RankedInsertion = {
      id: c.id,
      detourMinutes: detour,
      progressTowardBaseMinutes: progress,
      minutesFromPrevious: first,
      minutesToNext: second,
      rankingCost,
      requiresExceptionConfirmation: backwardsFromBase ||
        (clusterBridges && bridgeExtras !== null && bridgeExtras > 0),
      additionalBridgeCrossings: bridgeExtras,
    };

    (backwardsFromBase ? backwards : progressive).push(item);
  }

  const sortByCost = (a: RankedInsertion, b: RankedInsertion): number =>
    a.rankingCost - b.rankingCost || a.id.localeCompare(b.id);
  progressive.sort(sortByCost);
  backwards.sort(sortByCost);

  if (progressive.length > 0) {
    const selected = chooseBridgeCluster(progressive, clusterBridges);
    const onlyRepeatedCrossings = selected.options.length > 0 &&
      selected.options.every((x) => x.additionalBridgeCrossings !== null &&
        x.additionalBridgeCrossings > 0);
    return {
      status: onlyRepeatedCrossings && clusterBridges ? "exception_only" : "return_path",
      options: selected.options,
      withheldBacktracks: backwards.map((x) => x.id),
      withheldBridgeDetours: selected.withheld,
      bridgeUnverified,
      etaUnverified,
      excluded,
    };
  }
  if (backwards.length > 0) {
    const selected = chooseBridgeCluster(backwards, clusterBridges);
    return {
      status: "exception_only",
      options: selected.options,
      withheldBacktracks: [],
      withheldBridgeDetours: selected.withheld,
      bridgeUnverified,
      etaUnverified,
      excluded,
    };
  }
  return {
    status: etaUnverified.length > 0 ? "needs_route_eta" : "no_valid_slot",
    options: [],
    withheldBacktracks: [],
    withheldBridgeDetours: [],
    bridgeUnverified,
    etaUnverified,
    excluded,
  };
}
