import { describe, expect, it } from "vitest";
import {
  rankReturnRouteCandidates,
  type MeasuredInsertion,
} from "./returnRouteRanking";

/**
 * Entirely synthetic road data. They DO NOT assert actual drive times or which
 * bridge a real route uses. Route counts must be supplied by a verified provider.
 */
function candidate(id: string, patch: Partial<MeasuredInsertion> = {}): MeasuredInsertion {
  return {
    id,
    slotVerified: true,
    routeEtaVerified: true,
    previousToCandidateMinutes: 18,
    candidateToNextMinutes: 22,
    previousToNextMinutes: 36,
    previousToBaseMinutes: 50,
    candidateToBaseMinutes: 35,
    nextIsBase: false,
    strategicBridgeCrossings: {
      verified: true,
      previousToCandidate: 1,
      candidateToNext: 0,
      previousToNext: 1,
    },
    ...patch,
  };
}

describe("UNPRO — group appointments on the same side of major bridges", () => {
  it("prefers a same-side visit over a faster but extra twice-crossed river trip", () => {
    // A representative already crossed to the Laval-side region. A new
    // Montréal-island visit would go over a river bridge and immediately back.
    const sameSide = candidate("same-side", {
      previousToCandidateMinutes: 22,
      candidateToNextMinutes: 24,
      previousToNextMinutes: 35,
      strategicBridgeCrossings: {
        verified: true,
        previousToCandidate: 0,
        candidateToNext: 0,
        previousToNext: 0,
      },
    });
    const zigzag = candidate("back-across-bridge", {
      previousToCandidateMinutes: 8,
      candidateToNextMinutes: 8,
      previousToNextMinutes: 35,
      strategicBridgeCrossings: {
        verified: true,
        previousToCandidate: 1,
        candidateToNext: 1,
        previousToNext: 0,
      },
    });
    const result = rankReturnRouteCandidates([zigzag, sameSide]);
    expect(result.status).toBe("return_path");
    expect(result.options.map((x) => x.id)).toEqual(["same-side"]);
    expect(result.withheldBridgeDetours).toEqual(["back-across-bridge"]);
    expect(result.options[0].additionalBridgeCrossings).toBe(0);
  });

  it("allows a repeated crossing only as a clearly marked fallback", () => {
    const onlyChoice = candidate("exception", {
      strategicBridgeCrossings: {
        verified: true,
        previousToCandidate: 1,
        candidateToNext: 1,
        previousToNext: 0,
      },
    });
    const result = rankReturnRouteCandidates([onlyChoice]);
    expect(result.status).toBe("exception_only");
    expect(result.options).toHaveLength(1);
    expect(result.options[0]).toMatchObject({
      additionalBridgeCrossings: 2,
      requiresExceptionConfirmation: true,
    });
  });

  it("does not count a bridge already on the necessary route as an extra crossing", () => {
    const alongRoute = candidate("necessary-crossing", {
      strategicBridgeCrossings: {
        verified: true,
        previousToCandidate: 1,
        candidateToNext: 1,
        previousToNext: 2,
      },
    });
    const result = rankReturnRouteCandidates([alongRoute]);
    expect(result.status).toBe("return_path");
    expect(result.options[0].additionalBridgeCrossings).toBe(0);
    expect(result.options[0].requiresExceptionConfirmation).toBe(false);
  });

  it("does not invent bridge information based on town names or missing metadata", () => {
    const unmeasured = candidate("needs-bridge-route", {
      strategicBridgeCrossings: null,
    });
    const result = rankReturnRouteCandidates([unmeasured]);
    expect(result.status).toBe("return_path");
    expect(result.options[0].additionalBridgeCrossings).toBeNull();
    expect(result.bridgeUnverified).toEqual(["needs-bridge-route"]);
  });

  it("does not prefer an unverified bridge route over a proven no-extra-crossing route", () => {
    const known = candidate("measured", {
      strategicBridgeCrossings: {
        verified: true,
        previousToCandidate: 0,
        candidateToNext: 0,
        previousToNext: 0,
      },
    });
    const unknown = candidate("unmeasured", {
      strategicBridgeCrossings: {
        verified: false,
        previousToCandidate: 0,
        candidateToNext: 0,
        previousToNext: 0,
      },
    });
    const result = rankReturnRouteCandidates([unknown, known]);
    expect(result.options.map((x) => x.id)).toEqual(["measured"]);
    expect(result.bridgeUnverified).toEqual(["unmeasured"]);
  });

  it("treats invalid negative or fractional bridge crossings as unverified", () => {
    const broken = candidate("bad-measurement", {
      strategicBridgeCrossings: {
        verified: true,
        previousToCandidate: -1,
        candidateToNext: 0.5,
        previousToNext: 0,
      },
    });
    const result = rankReturnRouteCandidates([broken]);
    expect(result.bridgeUnverified).toEqual(["bad-measurement"]);
    expect(result.options[0].additionalBridgeCrossings).toBeNull();
  });

  it("still rejects unbookable slots and inter-visit drives over 60 minutes", () => {
    const result = rankReturnRouteCandidates([
      candidate("over-sixty", { previousToCandidateMinutes: 61 }),
      candidate("not-bookable", { slotVerified: false }),
      candidate("leg-after", { candidateToNextMinutes: 75 }),
      candidate("valid"),
    ], { maxLegMinutes: 60 });
    expect(result.excluded).toEqual(["over-sixty", "not-bookable", "leg-after"]);
    expect(result.options.map((x) => x.id)).toEqual(["valid"]);
  });

  it("does not misapply the inter-visit cap to the return home", () => {
    const home = candidate("home", {
      nextIsBase: true,
      candidateToNextMinutes: 75,
    });
    const result = rankReturnRouteCandidates([home]);
    expect(result.options.map((x) => x.id)).toEqual(["home"]);
  });

  it("preserves the existing return-to-base backtrack rule", () => {
    const towardBase = candidate("toward-base", {
      candidateToBaseMinutes: 30,
    });
    const backward = candidate("away-from-base", {
      candidateToBaseMinutes: 65,
      strategicBridgeCrossings: {
        verified: true,
        previousToCandidate: 0,
        candidateToNext: 0,
        previousToNext: 0,
      },
    });
    const result = rankReturnRouteCandidates([backward, towardBase]);
    expect(result.options.map((x) => x.id)).toEqual(["toward-base"]);
    expect(result.withheldBacktracks).toEqual(["away-from-base"]);
  });

  it("permits opting out of bridge clustering without bypassing the actual booking rules", () => {
    const regular = candidate("same-side", {
      strategicBridgeCrossings: {
        verified: true,
        previousToCandidate: 0,
        candidateToNext: 0,
        previousToNext: 0,
      },
    });
    const crossing = candidate("bridge", {
      strategicBridgeCrossings: {
        verified: true,
        previousToCandidate: 1,
        candidateToNext: 1,
        previousToNext: 0,
      },
    });
    const result = rankReturnRouteCandidates([regular, crossing], {
      preferBridgeClusters: false,
    });
    expect(result.options).toHaveLength(2);
    expect(result.withheldBridgeDetours).toHaveLength(0);
    expect(result.options.every((x) => x.requiresExceptionConfirmation === false)).toBe(true);
  });
});
