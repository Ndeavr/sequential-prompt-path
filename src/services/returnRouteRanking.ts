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
}

export interface ReturnRouteRules {
  /** Desired driving time between consecutive appointments. Defaults to 20. */
  idealLegMinutes?: number;
  /** Maximum driving time BETWEEN visits, not the final commute home. Default 60. */
  maxLegMinutes?: number;
  /** Small traffic noise allowance before counting a destination as backward. */
  backwardToleranceMinutes?: number;
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
}

export type ReturnRoutePlan = {
  status: "return_path" | "exception_only" | "needs_route_eta" | "no_valid_slot";
  /** Safe to suggest routinely: these progress toward the return location. */
  options: RankedInsertion[];
  /** IDs never promoted as an ordinary route-compatible suggestion. */
  withheldBacktracks: string[];
  /** Bookable candidates missing a verified ETA. No route claims may be made. */
  etaUnverified: string[];
  /** Candidates already invalid or exceeding the hard inter-visit trip limit. */
  excluded: string[];
};

const validTime = (n: number | null | undefined): n is number =>
  typeof n === "number" && Number.isFinite(n) && n >= 0;

const normalizeLimit = (value: number | undefined, fallback: number): number =>
  validTime(value) ? value : fallback;

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
 */
export function rankReturnRouteCandidates(
  candidates: readonly MeasuredInsertion[],
  preferences: ReturnRouteRules = {},
): ReturnRoutePlan {
  const ideal = normalizeLimit(preferences.idealLegMinutes, 20);
  const maximum = normalizeLimit(preferences.maxLegMinutes, 60);
  const tolerance = normalizeLimit(preferences.backwardToleranceMinutes, 0);

  const progressive: RankedInsertion[] = [];
  const backwards: RankedInsertion[] = [];
  const etaUnverified: string[] = [];
  const excluded: string[] = [];

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
      requiresExceptionConfirmation: backwardsFromBase,
    };

    (backwardsFromBase ? backwards : progressive).push(item);
  }

  const sortByCost = (a: RankedInsertion, b: RankedInsertion): number =>
    a.rankingCost - b.rankingCost || a.id.localeCompare(b.id);
  progressive.sort(sortByCost);
  backwards.sort(sortByCost);

  if (progressive.length > 0) {
    return {
      status: "return_path",
      options: progressive,
      withheldBacktracks: backwards.map((x) => x.id),
      etaUnverified,
      excluded,
    };
  }
  if (backwards.length > 0) {
    return {
      status: "exception_only",
      options: backwards,
      withheldBacktracks: [],
      etaUnverified,
      excluded,
    };
  }
  return {
    status: etaUnverified.length > 0 ? "needs_route_eta" : "no_valid_slot",
    options: [],
    withheldBacktracks: [],
    etaUnverified,
    excluded,
  };
}
